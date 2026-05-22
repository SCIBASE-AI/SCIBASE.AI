const MAX_RESOLVER_AGE_DAYS = 30;

function evaluatePersistentIdentifierReadiness(packet) {
  const reviewDate = parseDate(packet.reviewDate || new Date().toISOString());
  const project = packet.project || {};
  const artifacts = project.artifacts || [];
  const releaseStage = normalizeToken(project.releaseStage || "public");
  const blockers = [];
  const warnings = [];
  const readySignals = [];
  const remediationActions = [];
  const registry = buildIdentifierRegistry(artifacts);

  for (const entry of registry.values()) {
    const activeArtifacts = entry.artifacts.filter((artifact) => !isInactiveArtifact(artifact));
    if (activeArtifacts.length > 1) {
      blockers.push({
        code: "PERSISTENT_IDENTIFIER_COLLISION",
        severity: "hold",
        identifier: entry.key,
        message: `Persistent identifier ${entry.label} is reused by ${activeArtifacts.length} active artifacts.`,
      });
      remediationActions.push(`Mint distinct identifiers or withdraw duplicates for ${entry.label}.`);
    }
  }

  for (const artifact of artifacts) {
    evaluateArtifact(artifact, {
      releaseStage,
      reviewDate,
      registry,
      blockers,
      warnings,
      readySignals,
      remediationActions,
    });
  }

  if (artifacts.length === 0) {
    warnings.push({
      code: "NO_ARTIFACTS_TO_RELEASE",
      severity: "review",
      message: "No hosted research artifacts were supplied for identifier review.",
    });
  } else {
    readySignals.push(`${artifacts.length} hosted artifact(s) were inspected for PID, resolver, metadata, access, and version readiness.`);
  }

  const status = blockers.length > 0 ? "hold" : warnings.length > 0 ? "review" : "ready";
  return {
    projectId: project.id,
    projectTitle: project.title,
    status,
    blockers,
    warnings,
    readySignals,
    remediationActions: unique(remediationActions),
    reviewerPacket: buildReviewerPacket(project, status, blockers, warnings, readySignals),
    auditDigest: buildAuditDigest(project.id, status, blockers, warnings),
  };
}

function evaluateArtifact(artifact, context) {
  const identifiers = collectIdentifiers(artifact);
  const publicRelease = context.releaseStage === "public" && !isInactiveArtifact(artifact);

  if (identifiers.length === 0) {
    if (publicRelease) {
      context.blockers.push({
        code: "MISSING_PERSISTENT_IDENTIFIER",
        severity: "hold",
        artifactId: artifact.id,
        message: `${artifact.label || artifact.id} is public but has no DOI, ARK, UUID, or persistent URL.`,
      });
      context.remediationActions.push(`Mint or record a persistent identifier for ${artifact.label || artifact.id}.`);
    } else {
      context.readySignals.push(`${artifact.label || artifact.id} is not in public release scope and does not require a PID yet.`);
    }
  }

  for (const identifier of identifiers) {
    validateIdentifierShape(identifier, artifact, context);
  }

  validateLandingPage(artifact, publicRelease, context);
  validateResolverEvidence(artifact, publicRelease, context);
  validateStructuredMetadata(artifact, publicRelease, context);
  validateAccessControls(artifact, publicRelease, context);
  validateVersionChain(artifact, context);
  validateTombstone(artifact, context);

  if (identifiers.length > 0 && artifact.landingPage?.url && artifact.resolverEvidence?.httpStatus) {
    context.readySignals.push(`${artifact.label || artifact.id} has identifier, landing page, and resolver evidence.`);
  }
}

function validateIdentifierShape(identifier, artifact, context) {
  if (identifier.kind === "doi" && !/^10\.\d{4,9}\/\S+$/i.test(identifier.value)) {
    context.blockers.push({
      code: "INVALID_DOI_FORMAT",
      severity: "hold",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} has invalid DOI format: ${identifier.value}.`,
    });
    context.remediationActions.push(`Correct DOI syntax for ${artifact.label || artifact.id}.`);
  }

  if (identifier.kind === "ark" && !/^ark:\/\d{5,}\/\S+$/i.test(identifier.value)) {
    context.warnings.push({
      code: "ARK_FORMAT_NEEDS_REVIEW",
      severity: "review",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} has an ARK that does not match the expected ark:/NAAN/name pattern.`,
    });
  }

  if (identifier.kind === "url" && !isHttpUrl(identifier.value)) {
    context.blockers.push({
      code: "PERSISTENT_URL_NOT_HTTP",
      severity: "hold",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} persistent URL is not an HTTP(S) URL.`,
    });
    context.remediationActions.push(`Replace the persistent URL for ${artifact.label || artifact.id} with an HTTP(S) resolver or landing page URL.`);
  }
}

function validateLandingPage(artifact, publicRelease, context) {
  const landing = artifact.landingPage || {};
  if (!landing.url) {
    if (publicRelease) {
      context.blockers.push({
        code: "MISSING_LANDING_PAGE",
        severity: "hold",
        artifactId: artifact.id,
        message: `${artifact.label || artifact.id} needs a stable landing page URL before public release.`,
      });
      context.remediationActions.push(`Create a landing page for ${artifact.label || artifact.id} and map the PID resolver to it.`);
    }
    return;
  }

  if (!isHttpUrl(landing.url)) {
    context.blockers.push({
      code: "LANDING_PAGE_NOT_HTTP",
      severity: "hold",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} landing page is not an HTTP(S) URL.`,
    });
  }

  if (publicRelease && landing.status && ![200, 203].includes(Number(landing.status))) {
    context.blockers.push({
      code: "LANDING_PAGE_NOT_ACCESSIBLE",
      severity: "hold",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} landing page evidence reports HTTP ${landing.status}.`,
    });
    context.remediationActions.push(`Fix landing page availability for ${artifact.label || artifact.id}.`);
  }

  if (publicRelease && landing.allowsIndexing === false) {
    context.warnings.push({
      code: "LANDING_PAGE_NOT_INDEXABLE",
      severity: "review",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} landing page blocks indexing, reducing findability.`,
    });
  }
}

function validateResolverEvidence(artifact, publicRelease, context) {
  const evidence = artifact.resolverEvidence || {};
  if (!evidence.checkedAt) {
    if (publicRelease) {
      context.blockers.push({
        code: "MISSING_RESOLVER_EVIDENCE",
        severity: "hold",
        artifactId: artifact.id,
        message: `${artifact.label || artifact.id} has no captured resolver check evidence.`,
      });
      context.remediationActions.push(`Capture resolver status, canonical target, and checked timestamp for ${artifact.label || artifact.id}.`);
    }
    return;
  }

  const ageDays = daysBetween(parseDate(evidence.checkedAt), context.reviewDate);
  if (ageDays > MAX_RESOLVER_AGE_DAYS) {
    context.warnings.push({
      code: "RESOLVER_EVIDENCE_STALE",
      severity: "review",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} resolver evidence is ${ageDays} days old.`,
    });
    context.remediationActions.push(`Refresh resolver evidence for ${artifact.label || artifact.id}.`);
  }

  const status = Number(evidence.httpStatus);
  if (publicRelease && ![200, 203, 301, 302, 303].includes(status)) {
    context.blockers.push({
      code: "RESOLVER_STATUS_NOT_RELEASE_READY",
      severity: "hold",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} resolver evidence reports HTTP ${evidence.httpStatus}.`,
    });
    context.remediationActions.push(`Fix resolver response for ${artifact.label || artifact.id}.`);
  }

  if (artifact.landingPage?.url && evidence.canonicalUrl && normalizeUrl(evidence.canonicalUrl) !== normalizeUrl(artifact.landingPage.url)) {
    context.blockers.push({
      code: "RESOLVER_TARGET_MISMATCH",
      severity: "hold",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} resolver target does not match the declared landing page.`,
    });
    context.remediationActions.push(`Point the PID resolver for ${artifact.label || artifact.id} at the declared landing page.`);
  }
}

function validateStructuredMetadata(artifact, publicRelease, context) {
  const metadata = artifact.metadata || {};
  const datacite = metadata.datacite || {};
  const schemaOrg = metadata.schemaOrg || {};
  const dataciteMissing = [];
  const schemaMissing = [];

  if (!datacite.identifier) dataciteMissing.push("identifier");
  if (!Array.isArray(datacite.creators) || datacite.creators.length === 0) dataciteMissing.push("creators");
  if (!Array.isArray(datacite.titles) || datacite.titles.length === 0) dataciteMissing.push("titles");
  if (!datacite.publisher) dataciteMissing.push("publisher");
  if (!datacite.publicationYear) dataciteMissing.push("publicationYear");
  if (!datacite.types?.resourceTypeGeneral) dataciteMissing.push("types.resourceTypeGeneral");

  if (publicRelease && dataciteMissing.length > 0) {
    context.blockers.push({
      code: "DATACITE_METADATA_INCOMPLETE",
      severity: "hold",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} is missing DataCite fields: ${dataciteMissing.join(", ")}.`,
    });
    context.remediationActions.push(`Complete DataCite metadata for ${artifact.label || artifact.id}.`);
  }

  if (!schemaOrg["@type"]) schemaMissing.push("@type");
  if (!schemaOrg.identifier) schemaMissing.push("identifier");
  if (!schemaOrg.name) schemaMissing.push("name");
  if (!schemaOrg.url) schemaMissing.push("url");
  if (!schemaOrg.license) schemaMissing.push("license");

  if (publicRelease && schemaMissing.length > 0) {
    context.warnings.push({
      code: "SCHEMA_ORG_METADATA_INCOMPLETE",
      severity: "review",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} is missing schema.org fields: ${schemaMissing.join(", ")}.`,
    });
    context.remediationActions.push(`Complete schema.org discovery metadata for ${artifact.label || artifact.id}.`);
  }

  if (datacite.version && artifact.versioning?.version && String(datacite.version) !== String(artifact.versioning.version)) {
    context.warnings.push({
      code: "METADATA_VERSION_MISMATCH",
      severity: "review",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} DataCite version does not match hosting version.`,
    });
  }
}

function validateAccessControls(artifact, publicRelease, context) {
  const access = artifact.access || {};
  const restricted = normalizeToken(access.policy || artifact.accessPolicy) === "restricted";

  if (restricted && access.directDownloadUrl) {
    context.blockers.push({
      code: "DIRECT_DOWNLOAD_FOR_RESTRICTED_ARTIFACT",
      severity: "hold",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} is restricted but exposes a direct download URL.`,
    });
    context.remediationActions.push(`Route restricted access for ${artifact.label || artifact.id} through the landing page and approval flow only.`);
  }

  if (restricted && publicRelease && (!access.termsUrl || !access.contact)) {
    context.warnings.push({
      code: "RESTRICTED_ACCESS_TERMS_INCOMPLETE",
      severity: "review",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} needs public access terms and a request contact.`,
    });
  }

  if (publicRelease && !artifact.license && !artifact.metadata?.schemaOrg?.license) {
    context.blockers.push({
      code: "MISSING_REUSE_LICENSE",
      severity: "hold",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} lacks a reuse license in artifact or schema metadata.`,
    });
    context.remediationActions.push(`Attach a reuse license for ${artifact.label || artifact.id}.`);
  }
}

function validateVersionChain(artifact, context) {
  const versioning = artifact.versioning || {};
  const previous = versioning.previousIdentifier || versioning.previousPid;
  const replaces = versioning.replacesIdentifier || versioning.replaces;

  for (const reference of [previous, replaces].filter(Boolean)) {
    const key = normalizeIdentifierKey(reference);
    if (!context.registry.has(key)) {
      context.blockers.push({
        code: "VERSION_CHAIN_TARGET_MISSING",
        severity: "hold",
        artifactId: artifact.id,
        message: `${artifact.label || artifact.id} references missing version-chain identifier ${reference}.`,
      });
      context.remediationActions.push(`Add the referenced prior artifact or remove the broken version-chain link for ${artifact.label || artifact.id}.`);
    }
  }
}

function validateTombstone(artifact, context) {
  if (!isInactiveArtifact(artifact)) return;

  const tombstone = artifact.tombstone || {};
  if (!tombstone.url || !tombstone.reason) {
    context.blockers.push({
      code: "TOMBSTONE_METADATA_MISSING",
      severity: "hold",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} is ${artifact.state} but lacks tombstone URL or reason.`,
    });
    context.remediationActions.push(`Publish tombstone metadata for ${artifact.label || artifact.id}.`);
  }

  if (artifact.state === "superseded" && !tombstone.redirectsTo) {
    context.warnings.push({
      code: "SUPERSEDED_ARTIFACT_REPLACEMENT_MISSING",
      severity: "review",
      artifactId: artifact.id,
      message: `${artifact.label || artifact.id} is superseded but does not point to the replacement identifier.`,
    });
  }
}

function buildIdentifierRegistry(artifacts) {
  const registry = new Map();
  for (const artifact of artifacts) {
    for (const identifier of collectIdentifiers(artifact)) {
      const key = `${identifier.kind}:${normalizeIdentifier(identifier.value)}`;
      const entry = registry.get(key) || {
        key,
        label: `${identifier.kind}:${identifier.value}`,
        artifacts: [],
      };
      entry.artifacts.push(artifact);
      registry.set(key, entry);
    }
  }
  return registry;
}

function collectIdentifiers(artifact) {
  const pid = artifact.pid || {};
  const values = [
    ["doi", pid.doi],
    ["ark", pid.ark],
    ["uuid", pid.uuid],
    ["url", pid.url],
  ];
  return values
    .filter(([, value]) => Boolean(value))
    .map(([kind, value]) => ({ kind, value: String(value).trim() }));
}

function buildReviewerPacket(project, status, blockers, warnings, readySignals) {
  return {
    projectTitle: project.title,
    status,
    requiredDecision: status === "hold" ? "hold_release" : status === "review" ? "pid_review" : "release_artifacts",
    blockerCodes: blockers.map((blocker) => blocker.code),
    warningCodes: warnings.map((warning) => warning.code),
    readySignals,
  };
}

function buildAuditDigest(projectId, status, blockers, warnings) {
  const blockerCodes = blockers.map((blocker) => blocker.code).sort().join("|") || "none";
  const warningCodes = warnings.map((warning) => warning.code).sort().join("|") || "none";
  return `${projectId || "project"}:${status}:B=${blockerCodes}:W=${warningCodes}`;
}

function normalizeIdentifierKey(reference) {
  const value = String(reference || "").trim();
  if (/^10\.\d{4,9}\//i.test(value)) return `doi:${normalizeIdentifier(value)}`;
  if (/^ark:\//i.test(value)) return `ark:${normalizeIdentifier(value)}`;
  if (/^https?:\/\//i.test(value)) return `url:${normalizeIdentifier(value)}`;
  return `uuid:${normalizeIdentifier(value)}`;
}

function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase().replaceAll(" ", "-");
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return String(value || "").trim().replace(/\/$/, "");
  }
}

function isHttpUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value || ""));
}

function isInactiveArtifact(artifact) {
  return ["superseded", "withdrawn", "tombstoned"].includes(normalizeToken(artifact.state));
}

function parseDate(value) {
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date("1970-01-01T00:00:00Z");
  }
  return parsed;
}

function daysBetween(start, end) {
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}

function unique(values) {
  return [...new Set(values)];
}

module.exports = {
  evaluatePersistentIdentifierReadiness,
};
