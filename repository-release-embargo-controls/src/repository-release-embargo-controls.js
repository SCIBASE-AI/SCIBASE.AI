"use strict";

const crypto = require("node:crypto");

const LARGE_FILE_BYTES = 100 * 1024 * 1024;
const REQUIRED_EXPORT_FILES = [
  "metadata.json",
  "LICENSE",
  "CITATION.cff",
  "manifest.json",
  "checksums.sha256",
];

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function requireFields(object, fields, label) {
  const missing = fields.filter((field) => object[field] === undefined || object[field] === null);
  if (missing.length > 0) {
    throw new Error(`${label} is missing required field(s): ${missing.join(", ")}`);
  }
}

function createFinding(severity, id, title, detail, remediation) {
  return { severity, id, title, detail, remediation };
}

function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parsed;
}

function assertBundle(bundle) {
  requireFields(bundle, [
    "repository",
    "components",
    "versions",
    "releaseCandidate",
    "reproducibilityRuns",
    "accessPolicies",
  ], "release control bundle");
  requireFields(bundle.repository, ["id", "name", "steward"], "repository");
  requireFields(bundle.releaseCandidate, [
    "version",
    "visibility",
    "parentVersion",
    "manifest",
    "exportFiles",
    "requiredPipelineIds",
  ], "release candidate");
}

function buildComponentManifest(components) {
  return components.map((component) => {
    requireFields(component, ["path", "type", "bytes", "hash"], `component ${component.path || "(unknown)"}`);
    return {
      path: component.path,
      type: component.type,
      bytes: component.bytes,
      hash: component.hash,
      lfsPointer: Boolean(component.lfsPointer),
      restricted: Boolean(component.restricted),
      license: component.license || "unspecified",
    };
  });
}

function evaluateComponents(componentManifest) {
  const findings = [];

  for (const component of componentManifest) {
    if (component.bytes >= LARGE_FILE_BYTES && !component.lfsPointer) {
      findings.push(createFinding(
        "blocker",
        "large-file-lfs-routing",
        "Large repository artifact is not routed through LFS",
        `${component.path} is ${(component.bytes / (1024 * 1024)).toFixed(1)} MB and has no LFS pointer.`,
        "Store the large artifact through Git LFS or an equivalent object-store pointer before release.",
      ));
    }

    if (!component.hash.startsWith("sha256:")) {
      findings.push(createFinding(
        "blocker",
        "component-hash-format",
        "Component hash is not a sha256 digest",
        `${component.path} has hash ${component.hash}.`,
        "Record every release component as sha256:<digest> in the manifest.",
      ));
    }
  }

  return findings;
}

function evaluateEmbargo(repository, releaseCandidate, accessPolicies, now) {
  const findings = [];
  const embargoUntil = normalizeDate(releaseCandidate.embargoUntil || repository.embargoUntil);
  const activeRestrictedComponent = releaseCandidate.manifest.some((entry) => entry.restricted);
  const hasActivePolicy = accessPolicies.some((policy) => {
    const expiresAt = normalizeDate(policy.expiresAt);
    return policy.status === "active" && (!expiresAt || expiresAt > now);
  });

  if (releaseCandidate.visibility === "public" && embargoUntil && embargoUntil > now) {
    findings.push(createFinding(
      "blocker",
      "active-embargo-window",
      "Release is public before the embargo expires",
      `${releaseCandidate.version} is public but embargoed until ${embargoUntil.toISOString()}.`,
      "Keep the release private or move the public release date after the embargo window.",
    ));
  }

  if (activeRestrictedComponent && !hasActivePolicy) {
    findings.push(createFinding(
      "blocker",
      "restricted-access-policy-missing",
      "Restricted artifacts have no active access policy",
      "The manifest contains restricted data but no active repository access policy covers the release.",
      "Attach an active access policy with steward, allowed roles, and expiry before publishing.",
    ));
  }

  return findings;
}

function evaluateCitation(repository, releaseCandidate) {
  const findings = [];
  const hasDoi = Boolean(releaseCandidate.doi || releaseCandidate.reservedDoi || repository.doi);

  if (!hasDoi) {
    findings.push(createFinding(
      "blocker",
      "doi-or-reservation-missing",
      "Release has no DOI or reserved DOI",
      "Scientific releases need a stable identifier before export.",
      "Reserve or attach a DOI for the release candidate.",
    ));
  }

  if (!releaseCandidate.semanticTag) {
    findings.push(createFinding(
      "warning",
      "semantic-version-tag-missing",
      "Release lacks semantic scientific tag metadata",
      "The candidate has a version but no dataset/model/protocol semantic change tag.",
      "Add a semantic tag that explains the scientific scope of the version.",
    ));
  }

  const citation = releaseCandidate.citation || repository.citation || {};
  for (const field of ["authors", "affiliations", "funding"]) {
    if (!Array.isArray(citation[field]) || citation[field].length === 0) {
      findings.push(createFinding(
        "warning",
        `citation-${field}-missing`,
        `Citation ${field} are missing`,
        `The release citation has no ${field} entries.`,
        `Add ${field} metadata to CITATION.cff before release.`,
      ));
    }
  }

  return findings;
}

function latestRunByPipeline(reproducibilityRuns) {
  const latest = new Map();
  for (const run of reproducibilityRuns) {
    const previous = latest.get(run.pipelineId);
    if (!previous || new Date(run.completedAt) > new Date(previous.completedAt)) {
      latest.set(run.pipelineId, run);
    }
  }
  return latest;
}

function evaluateReproducibility(reproducibilityRuns, requiredPipelineIds) {
  const findings = [];
  const latest = latestRunByPipeline(reproducibilityRuns);

  for (const pipelineId of requiredPipelineIds) {
    const run = latest.get(pipelineId);
    if (!run) {
      findings.push(createFinding(
        "blocker",
        "reproducibility-run-missing",
        "Required reproducibility pipeline has not run",
        `${pipelineId} has no recorded execution for this release.`,
        "Run the required reproducibility pipeline and attach its evidence hash.",
      ));
      continue;
    }

    if (run.status !== "passed") {
      findings.push(createFinding(
        "blocker",
        "reproducibility-run-failed",
        "Required reproducibility pipeline did not pass",
        `${pipelineId} completed with status ${run.status}.`,
        "Fix the pipeline or release inputs, then rerun before publishing.",
      ));
    }

    if (!run.outputHash || !run.outputHash.startsWith("sha256:")) {
      findings.push(createFinding(
        "blocker",
        "reproducibility-evidence-hash-missing",
        "Reproducibility evidence hash is missing",
        `${pipelineId} does not include a sha256 output evidence hash.`,
        "Attach a deterministic hash of the pipeline outputs.",
      ));
    }
  }

  return findings;
}

function evaluateExportBundle(releaseCandidate, componentManifest) {
  const findings = [];
  const manifestPaths = new Set(releaseCandidate.manifest.map((entry) => entry.path));
  const componentPaths = new Set(componentManifest.map((component) => component.path));
  const exportedFiles = new Set(releaseCandidate.exportFiles);

  for (const componentPath of componentPaths) {
    if (!manifestPaths.has(componentPath)) {
      findings.push(createFinding(
        "blocker",
        "manifest-component-missing",
        "Release manifest omits a repository component",
        `${componentPath} is present in the repository but absent from the release manifest.`,
        "Regenerate the manifest so every released component is included.",
      ));
    }
  }

  for (const requiredFile of REQUIRED_EXPORT_FILES) {
    if (!exportedFiles.has(requiredFile)) {
      findings.push(createFinding(
        "blocker",
        "export-bundle-incomplete",
        "Release export bundle is missing required metadata",
        `${requiredFile} is absent from the export bundle.`,
        "Include metadata, license, citation, manifest, and checksum files in every export bundle.",
      ));
    }
  }

  return findings;
}

function evaluateRollback(versions, releaseCandidate) {
  const findings = [];
  const parent = versions.find((version) => version.version === releaseCandidate.parentVersion);

  if (!parent) {
    findings.push(createFinding(
      "blocker",
      "parent-version-missing",
      "Release has no known rollback parent",
      `${releaseCandidate.parentVersion} is not present in the version ledger.`,
      "Record the parent version before releasing a new version.",
    ));
  } else if (!parent.rollbackSnapshotHash || !parent.rollbackSnapshotHash.startsWith("sha256:")) {
    findings.push(createFinding(
      "blocker",
      "rollback-snapshot-missing",
      "Rollback snapshot hash is missing",
      `${parent.version} cannot be restored deterministically.`,
      "Store a sha256 rollback snapshot hash for the parent release.",
    ));
  }

  return findings;
}

function buildChecklist(findings) {
  const blockers = new Set(findings.filter((finding) => finding.severity === "blocker").map((finding) => finding.id));
  const warnings = new Set(findings.filter((finding) => finding.severity === "warning").map((finding) => finding.id));

  return [
    ["embargo", "active-embargo-window"],
    ["access-policy", "restricted-access-policy-missing"],
    ["large-file-routing", "large-file-lfs-routing"],
    ["citation", "doi-or-reservation-missing"],
    ["reproducibility", "reproducibility-run-failed"],
    ["export-bundle", "export-bundle-incomplete"],
    ["rollback", "rollback-snapshot-missing"],
  ].map(([name, findingId]) => ({
    name,
    status: blockers.has(findingId) ? "blocked" : warnings.has(findingId) ? "review" : "passed",
  }));
}

function decideRelease(findings) {
  if (findings.some((finding) => finding.severity === "blocker")) {
    return "blocked";
  }
  if (findings.some((finding) => finding.severity === "warning")) {
    return "manual-review";
  }
  return "release-ready";
}

function analyzeRepositoryReleaseControls(bundle, options = {}) {
  assertBundle(bundle);

  const now = normalizeDate(options.now || bundle.now || new Date().toISOString());
  const componentManifest = buildComponentManifest(bundle.components);
  const findings = [
    ...evaluateComponents(componentManifest),
    ...evaluateEmbargo(bundle.repository, bundle.releaseCandidate, bundle.accessPolicies, now),
    ...evaluateCitation(bundle.repository, bundle.releaseCandidate),
    ...evaluateReproducibility(bundle.reproducibilityRuns, bundle.releaseCandidate.requiredPipelineIds),
    ...evaluateExportBundle(bundle.releaseCandidate, componentManifest),
    ...evaluateRollback(bundle.versions, bundle.releaseCandidate),
  ];
  const releaseChecklist = buildChecklist(findings);
  const releaseDecision = decideRelease(findings);
  const auditDigest = stableHash({
    repositoryId: bundle.repository.id,
    version: bundle.releaseCandidate.version,
    releaseDecision,
    findings,
    componentManifest,
    releaseChecklist,
  });

  return {
    repositoryId: bundle.repository.id,
    repositoryName: bundle.repository.name,
    evaluatedAt: now.toISOString(),
    releaseVersion: bundle.releaseCandidate.version,
    releaseDecision,
    findings,
    componentManifest,
    releaseChecklist,
    auditDigest: `sha256:${auditDigest}`,
  };
}

module.exports = {
  REQUIRED_EXPORT_FILES,
  analyzeRepositoryReleaseControls,
  stableHash,
  stableStringify,
};
