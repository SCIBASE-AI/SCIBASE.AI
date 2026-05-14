import { createHash } from "node:crypto";

export const TARGET_PROFILES = {
  "institutional-repository": {
    label: "Institutional repository",
    lane: "repository",
    systems: ["DSpace", "Invenio", "EPrints"],
    requiredTypes: ["manuscript", "dataset", "metadata"],
    acceptedFormats: ["markdown", "latex", "csv", "json-ld", "datacite-json", "ipynb", "python", "png", "bibtex"],
    plugin: "repository-bundle-v1",
    webhookTopic: "enterprise.export.repository.ready",
    evidence: ["openAccessStatus", "dataAvailability", "auditReview"]
  },
  arxiv: {
    label: "arXiv preprint",
    lane: "preprint",
    systems: ["arXiv"],
    requiredTypes: ["manuscript", "references"],
    acceptedFormats: ["latex", "bibtex", "png"],
    plugin: "latex-preprint-v1",
    webhookTopic: "enterprise.export.preprint.ready",
    evidence: ["license", "versionHistory"]
  },
  "pubmed-central": {
    label: "PubMed Central indexed repository",
    lane: "indexed-repository",
    systems: ["PubMed Central", "EuropePMC"],
    requiredTypes: ["manuscript", "figure", "metadata"],
    acceptedFormats: ["jats", "png", "json-ld", "datacite-json"],
    plugin: "jats-indexed-repository-v1",
    webhookTopic: "enterprise.export.indexed.ready",
    evidence: ["ethicsStatement", "dataAvailability", "openAccessStatus"]
  },
  zenodo: {
    label: "Zenodo research object",
    lane: "indexed-repository",
    systems: ["Zenodo"],
    requiredTypes: ["dataset", "code", "metadata"],
    acceptedFormats: ["csv", "python", "ipynb", "json-ld", "datacite-json", "markdown"],
    plugin: "fair-research-object-v1",
    webhookTopic: "enterprise.export.zenodo.ready",
    evidence: ["license", "doi", "dataAvailability"]
  },
  "journal-submission": {
    label: "Journal submission platform",
    lane: "journal",
    systems: ["Editorial Manager", "ScholarOne", "Open Journal Systems"],
    requiredTypes: ["manuscript", "figure", "cover-letter", "references"],
    acceptedFormats: ["jats", "latex", "markdown", "png", "bibtex"],
    plugin: "journal-submission-pack-v1",
    webhookTopic: "enterprise.export.journal.ready",
    evidence: ["ethicsStatement", "dataAvailability", "citationTracking"]
  },
  "nih-reporter": {
    label: "NIH RePORTER funder portal",
    lane: "funder",
    systems: ["NIH RePORTER"],
    requiredTypes: ["manuscript", "dataset", "funder-report", "metadata"],
    acceptedFormats: ["markdown", "csv", "datacite-json", "json-ld", "jats"],
    plugin: "nih-public-access-report-v1",
    webhookTopic: "enterprise.export.funder.nih.ready",
    evidence: ["funderMandates", "openAccessStatus", "retentionPolicy", "auditReview"]
  },
  "horizon-eu": {
    label: "Horizon Europe grant portal",
    lane: "funder",
    systems: ["Horizon Europe", "CORDIS"],
    requiredTypes: ["manuscript", "dataset", "funder-report", "metadata"],
    acceptedFormats: ["markdown", "csv", "datacite-json", "json-ld", "jats"],
    plugin: "horizon-eu-deliverable-v1",
    webhookTopic: "enterprise.export.funder.horizon.ready",
    evidence: ["funderMandates", "dataAvailability", "reproducibilityScore"]
  }
};

export function listExportTargets() {
  return Object.entries(TARGET_PROFILES).map(([key, profile]) => ({
    key,
    label: profile.label,
    lane: profile.lane,
    systems: profile.systems,
    requiredTypes: profile.requiredTypes,
    plugin: profile.plugin,
    webhookTopic: profile.webhookTopic
  }));
}

export function buildExportPackage(project, targetKey, options = {}) {
  const profile = getTargetProfile(targetKey);
  const generatedAt = options.generatedAt ?? project.updatedAt ?? new Date().toISOString();
  const includePrivate = options.includePrivate === true;
  const artifacts = selectArtifacts(project.artifacts, profile, includePrivate);
  const readiness = validateExportReadiness(project, targetKey, artifacts);
  const complianceEvidence = buildComplianceEvidence(project, targetKey);
  const manifest = buildManifest(project, profile, targetKey, artifacts, complianceEvidence);
  const exportId = checksumObject({
    projectId: project.id,
    targetKey,
    version: project.version,
    artifactIds: artifacts.map((artifact) => artifact.id)
  }).slice(0, 16);

  const exportPackage = {
    exportId: `export-${targetKey}-${exportId}`,
    target: {
      key: targetKey,
      label: profile.label,
      lane: profile.lane,
      systems: profile.systems
    },
    status: readiness.errors.length > 0 ? "blocked" : readiness.warnings.length > 0 ? "ready_with_warnings" : "ready",
    generatedAt,
    requestedBy: options.requestedBy ?? "enterprise-admin",
    manifest,
    formattingPlugin: {
      id: profile.plugin,
      preserves: ["doi", "orcid", "citations", "version-history", "repository-provenance"],
      acceptedFormats: profile.acceptedFormats
    },
    handoff: {
      authModel: "service-account-with-scoped-token",
      webhookTopic: profile.webhookTopic,
      retryPolicy: {
        attempts: 5,
        backoff: "exponential",
        deadLetterQueue: `${profile.lane}-export-dead-letter`
      }
    },
    readiness,
    complianceEvidence,
    nextActions: buildNextActions(readiness, profile)
  };

  return {
    ...exportPackage,
    integrationEvent: buildIntegrationEvent(exportPackage, options.webhookSecret)
  };
}

export function buildEnterpriseDashboard(project, targetKeys = Object.keys(TARGET_PROFILES)) {
  const packages = targetKeys.map((targetKey) => buildExportPackage(project, targetKey));
  const blocked = packages.filter((item) => item.status === "blocked");
  const warning = packages.filter((item) => item.status === "ready_with_warnings");
  const ready = packages.filter((item) => item.status === "ready");
  const lanes = packages.reduce((accumulator, item) => {
    accumulator[item.target.lane] ??= { total: 0, ready: 0, blocked: 0, warnings: 0 };
    accumulator[item.target.lane].total += 1;
    accumulator[item.target.lane].ready += item.status === "ready" ? 1 : 0;
    accumulator[item.target.lane].blocked += item.status === "blocked" ? 1 : 0;
    accumulator[item.target.lane].warnings += item.status === "ready_with_warnings" ? 1 : 0;
    return accumulator;
  }, {});

  return {
    project: {
      id: project.id,
      title: project.title,
      version: project.version,
      doi: project.doi,
      visibility: project.visibility
    },
    summary: {
      totalTargets: packages.length,
      ready: ready.length,
      readyWithWarnings: warning.length,
      blocked: blocked.length,
      publicArtifactCount: project.artifacts.filter((artifact) => artifact.public).length,
      privateArtifactCount: project.artifacts.filter((artifact) => !artifact.public).length
    },
    lanes,
    targets: packages.map((item) => ({
      key: item.target.key,
      label: item.target.label,
      status: item.status,
      plugin: item.formattingPlugin.id,
      artifactCount: item.manifest.contents.length,
      webhookTopic: item.handoff.webhookTopic,
      warnings: item.readiness.warnings,
      errors: item.readiness.errors
    }))
  };
}

export function buildIntegrationEvent(exportPackage, secret = "scibase-local-review-secret") {
  const payload = {
    eventType: exportPackage.handoff.webhookTopic,
    exportId: exportPackage.exportId,
    target: exportPackage.target.key,
    status: exportPackage.status,
    manifestChecksum: exportPackage.manifest.checksums.manifest,
    artifactCount: exportPackage.manifest.contents.length
  };

  return {
    id: `evt-${checksumObject(payload).slice(0, 16)}`,
    createdAt: exportPackage.generatedAt,
    payload,
    signature: `sha256=${checksum(`${stableJson(payload)}:${secret}`)}`,
    delivery: exportPackage.handoff.retryPolicy
  };
}

export function buildComplianceEvidence(project, targetKey) {
  const profile = getTargetProfile(targetKey);
  const publicArtifacts = project.artifacts.filter((artifact) => artifact.public);
  const privateArtifacts = project.artifacts.filter((artifact) => !artifact.public);

  return {
    requiredEvidence: profile.evidence,
    openAccessStatus: project.compliance.openAccessStatus,
    dataAvailability: project.compliance.dataAvailability,
    ethicsStatement: project.compliance.ethicsStatement,
    retentionPolicy: project.compliance.retentionPolicy,
    consentClass: project.compliance.consentClass,
    auditReview: project.compliance.auditReview,
    reproducibilityScore: project.compliance.reproducibilityScore,
    funderMandates: project.funders.map((funder) => ({
      funder: funder.name,
      grantId: funder.grantId,
      mandate: funder.mandate
    })),
    citationTracking: project.citations.map((citation) => citation.doi),
    artifactDisclosure: {
      publicArtifacts: publicArtifacts.length,
      privateArtifacts: privateArtifacts.length,
      privateArtifactsExcludedByDefault: true
    }
  };
}

export function validateExportReadiness(project, targetKey, artifacts = undefined) {
  const profile = getTargetProfile(targetKey);
  const selectedArtifacts = artifacts ?? selectArtifacts(project.artifacts, profile, false);
  const selectedTypes = new Set(selectedArtifacts.map((artifact) => artifact.type));
  const errors = [];
  const warnings = [];

  for (const requiredType of profile.requiredTypes) {
    if (!selectedTypes.has(requiredType)) {
      errors.push(`Missing required ${requiredType} artifact for ${profile.label}`);
    }
  }

  if (!project.doi && ["zenodo", "pubmed-central", "institutional-repository"].includes(targetKey)) {
    errors.push("A DOI is required for persistent repository export");
  }

  if (!project.authors.every((author) => author.orcid)) {
    warnings.push("At least one author is missing ORCID metadata");
  }

  if (project.compliance.openAccessStatus !== "ready") {
    warnings.push("Open access status is not marked ready");
  }

  if (project.artifacts.some((artifact) => !artifact.public)) {
    warnings.push("Private artifacts are excluded unless includePrivate is explicitly enabled");
  }

  return {
    errors,
    warnings,
    missingTypes: profile.requiredTypes.filter((requiredType) => !selectedTypes.has(requiredType))
  };
}

function buildManifest(project, profile, targetKey, artifacts, complianceEvidence) {
  const contents = artifacts.map((artifact) => ({
    id: artifact.id,
    type: artifact.type,
    path: artifact.path,
    format: artifact.format,
    sizeBytes: artifact.sizeBytes,
    checksum: checksumObject({
      id: artifact.id,
      path: artifact.path,
      format: artifact.format,
      sizeBytes: artifact.sizeBytes
    })
  }));

  const manifest = {
    schema: "scibase.enterprise-export-manifest.v1",
    target: targetKey,
    project: {
      id: project.id,
      title: project.title,
      version: project.version,
      releaseTag: project.releaseTag,
      doi: project.doi,
      license: project.license,
      repositoryUrl: project.repositoryUrl
    },
    contributors: project.authors.map((author) => ({
      name: author.name,
      orcid: author.orcid,
      affiliation: author.affiliation,
      roles: author.roles
    })),
    citations: project.citations,
    versionHistory: project.versionHistory,
    contents,
    compliance: complianceEvidence,
    provenance: {
      source: "SCIBASE project repository",
      plugin: profile.plugin,
      systems: profile.systems,
      generatedFromVersion: project.version
    }
  };

  return {
    ...manifest,
    checksums: {
      manifest: checksumObject(manifest),
      contents: checksumObject(contents)
    }
  };
}

function selectArtifacts(artifacts, profile, includePrivate) {
  return artifacts
    .filter((artifact) => includePrivate || artifact.public)
    .filter((artifact) => profile.requiredTypes.includes(artifact.type) || profile.acceptedFormats.includes(artifact.format))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function buildNextActions(readiness, profile) {
  if (readiness.errors.length > 0) {
    return readiness.errors.map((error) => ({
      type: "fix-blocker",
      message: error
    }));
  }

  return [
    {
      type: "review-package",
      message: `Review ${profile.plugin} package manifest before delivery`
    },
    {
      type: "send-webhook",
      message: `Deliver signed event to ${profile.webhookTopic}`
    },
    ...readiness.warnings.map((warning) => ({
      type: "confirm-warning",
      message: warning
    }))
  ];
}

function getTargetProfile(targetKey) {
  const profile = TARGET_PROFILES[targetKey];
  if (!profile) {
    throw new Error(`Unknown export target: ${targetKey}`);
  }
  return profile;
}

function checksumObject(value) {
  return checksum(stableJson(value));
}

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
