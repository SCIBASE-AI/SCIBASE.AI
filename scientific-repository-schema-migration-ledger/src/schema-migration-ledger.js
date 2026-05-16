"use strict";

const crypto = require("node:crypto");

const DEFAULT_SECRET = "scibase-repository-schema-migration-demo-secret";
const REQUIRED_CITATION_FORMATS = ["apa", "bibtex"];
const REPOSITORY_COMPONENTS = ["metadata", "manuscript", "data", "code", "notebook", "results", "protocol"];

function evaluateMigrationBook(book, options = {}) {
  if (!book || typeof book !== "object") {
    throw new Error("A repository migration book is required.");
  }

  const repositories = (book.repositories || []).map((repository) =>
    evaluateRepositoryMigration(repository, book.targetSchema)
  );
  const summary = summarizeRepositories(repositories);
  const adminMetrics = buildAdminMetrics(repositories);
  const attestations = repositories.map((repository) =>
    signAttestation(
      {
        type: "repository.metadata_schema_migration.evaluated",
        asOf: book.asOf,
        repositoryId: repository.repositoryId,
        sourceSchema: repository.currentSchema,
        targetSchema: repository.targetSchema,
        migrationDecision: repository.migrationDecision,
        semanticImpact: repository.semanticImpact,
        blockedChecks: repository.checkCounts.blocker,
        reviewChecks: repository.checkCounts.review
      },
      options.secret || DEFAULT_SECRET
    )
  );

  return {
    schemaVersion: "2026-05-16.scientific-repository-schema-migration-ledger.v1",
    asOf: book.asOf,
    targetSchema: book.targetSchema,
    summary,
    adminMetrics,
    repositories,
    attestations
  };
}

function evaluateRepositoryMigration(repository, targetSchema) {
  const checks = [
    ...checkMetadata(repository),
    ...checkLineage(repository),
    ...checkComponents(repository),
    ...checkReleaseIntent(repository)
  ];
  const checkCounts = countChecks(checks);
  const migrationDecision = decideMigration(checkCounts);
  const semanticImpact = calculateSemanticImpact(repository, checks);
  const rollbackPlan = buildRollbackPlan(repository, migrationDecision);
  const compatibilityPacket = buildCompatibilityPacket(repository, targetSchema, checks, semanticImpact);

  return {
    repositoryId: repository.repositoryId,
    title: repository.title,
    currentVersion: repository.currentVersion,
    targetVersion: repository.targetVersion,
    currentSchema: repository.currentSchema,
    targetSchema,
    migrationDecision,
    semanticImpact,
    checkCounts,
    checks,
    rollbackPlan,
    compatibilityPacket
  };
}

function checkMetadata(repository) {
  const metadata = repository.metadata || {};
  const checks = [];

  if (!metadata.doi) {
    checks.push(blocker("doi", "Missing DOI before metadata schema migration", "Mint or import the DOI before release tagging."));
  }

  for (const format of REQUIRED_CITATION_FORMATS) {
    if (!metadata.citation || !metadata.citation[format]) {
      checks.push(
        review(
          "citation",
          `Missing ${format.toUpperCase()} citation output`,
          "Generate all configured citation formats before export bundle publication."
        )
      );
    }
  }

  const missingOrcid = (metadata.authors || []).filter((author) => !author.orcid);
  if (missingOrcid.length > 0) {
    checks.push(
      review(
        "orcid",
        `${missingOrcid.length} author(s) missing ORCID identifiers`,
        "Collect contributor ORCID values so migrated metadata preserves author identity."
      )
    );
  }

  if (!Array.isArray(metadata.funding) || metadata.funding.length === 0) {
    checks.push(
      review(
        "funding",
        "Funding metadata is empty",
        "Add funder and award metadata before repository citation export."
      )
    );
  }

  if (metadata.deprecatedFields && metadata.deprecatedFields.length > 0) {
    checks.push(
      review(
        "deprecated-fields",
        `${metadata.deprecatedFields.length} deprecated metadata field(s) require migration notes`,
        "Record field mapping or removal rationale in the migration packet."
      )
    );
  }

  if (!metadata.schemaOrgType) {
    checks.push(
      blocker(
        "schema-org",
        "Missing schema.org type",
        "Set the repository schema.org type before publishing migrated metadata."
      )
    );
  }

  return checks;
}

function checkLineage(repository) {
  const lineage = repository.lineage || {};

  if (lineage.forkedFrom && lineage.attributionStatus !== "recorded") {
    return [
      blocker(
        "fork-attribution",
        `Fork lineage from ${lineage.forkedFrom} is not recorded`,
        "Preserve upstream attribution before releasing the migrated repository metadata."
      )
    ];
  }

  return [];
}

function checkComponents(repository) {
  const checks = [];
  const components = repository.components || [];
  const kinds = new Set(components.map((component) => component.kind));

  if (!kinds.has("metadata")) {
    checks.push(blocker("components", "metadata.json component is missing", "Add metadata.json to the repository manifest."));
  }

  for (const kind of kinds) {
    if (!REPOSITORY_COMPONENTS.includes(kind)) {
      checks.push(
        review("components", `Unknown repository component kind ${kind}`, "Map the component to a supported scientific repository type.")
      );
    }
  }

  for (const component of components) {
    if (!component.currentHash || !component.targetHash) {
      checks.push(
        blocker(
          "content-hash",
          `${component.path} is missing current or target hash evidence`,
          "Generate hash evidence before recording the migration."
        )
      );
    }
  }

  return checks;
}

function checkReleaseIntent(repository) {
  const releaseIntent = repository.releaseIntent || {};

  if (!releaseIntent.tag) {
    return [review("release-tag", "Release tag is missing", "Choose a semantic release tag before migration approval.")];
  }

  if (!isSemver(repository.targetVersion)) {
    return [blocker("semantic-version", "Target version is not semantic", "Use semantic versioning for repository releases.")];
  }

  return [];
}

function buildRollbackPlan(repository, migrationDecision) {
  const metadataComponent = (repository.components || []).find((component) => component.kind === "metadata");
  const releaseIntent = repository.releaseIntent || {};

  return {
    required: Boolean(releaseIntent.requiresRollbackPlan) || migrationDecision !== "ready",
    restoreVersion: repository.currentVersion,
    restoreSchema: repository.currentSchema,
    restoreMetadataHash: metadataComponent ? metadataComponent.currentHash : null,
    targetMetadataHash: metadataComponent ? metadataComponent.targetHash : null,
    rollbackCommand: `restore ${repository.repositoryId} metadata.json to ${repository.currentVersion}`,
    notes:
      migrationDecision === "ready"
        ? "Rollback plan is retained for audit continuity."
        : "Rollback plan must be approved before migration proceeds."
  };
}

function buildCompatibilityPacket(repository, targetSchema, checks, semanticImpact) {
  const changedComponents = (repository.components || []).filter((component) => component.currentHash !== component.targetHash);
  const packet = {
    repositoryId: repository.repositoryId,
    fromSchema: repository.currentSchema,
    toSchema: targetSchema,
    fromVersion: repository.currentVersion,
    toVersion: repository.targetVersion,
    semanticImpact,
    changedComponentPaths: changedComponents.map((component) => component.path),
    exportTargets: (repository.releaseIntent && repository.releaseIntent.exportTargets) || [],
    blockerTitles: checks.filter((check) => check.severity === "blocker").map((check) => check.title),
    reviewTitles: checks.filter((check) => check.severity === "review").map((check) => check.title)
  };

  return {
    ...packet,
    packetDigest: digest(packet)
  };
}

function calculateSemanticImpact(repository, checks) {
  const majorChange = majorVersion(repository.targetVersion) > majorVersion(repository.currentVersion);

  if (checks.some((check) => check.severity === "blocker") || majorChange) {
    return "major";
  }

  if ((repository.components || []).some((component) => component.currentHash !== component.targetHash)) {
    return "minor";
  }

  return "patch";
}

function decideMigration(counts) {
  if (counts.blocker > 0) {
    return "blocked";
  }

  if (counts.review > 0) {
    return "needs_review";
  }

  return "ready";
}

function summarizeRepositories(repositories) {
  const summary = {
    totalRepositories: repositories.length,
    ready: 0,
    needsReview: 0,
    blocked: 0,
    majorImpact: 0,
    minorImpact: 0,
    patchImpact: 0
  };

  for (const repository of repositories) {
    summary.ready += repository.migrationDecision === "ready" ? 1 : 0;
    summary.needsReview += repository.migrationDecision === "needs_review" ? 1 : 0;
    summary.blocked += repository.migrationDecision === "blocked" ? 1 : 0;
    summary.majorImpact += repository.semanticImpact === "major" ? 1 : 0;
    summary.minorImpact += repository.semanticImpact === "minor" ? 1 : 0;
    summary.patchImpact += repository.semanticImpact === "patch" ? 1 : 0;
  }

  return summary;
}

function buildAdminMetrics(repositories) {
  return {
    migrationQueue: repositories
      .filter((repository) => repository.migrationDecision !== "ready")
      .map((repository) => ({
        repositoryId: repository.repositoryId,
        decision: repository.migrationDecision,
        semanticImpact: repository.semanticImpact,
        blockers: repository.checkCounts.blocker,
        reviews: repository.checkCounts.review
      })),
    exportReadyRepositoryIds: repositories
      .filter((repository) => repository.migrationDecision === "ready")
      .map((repository) => repository.repositoryId)
  };
}

function countChecks(checks) {
  return checks.reduce(
    (counts, check) => {
      counts[check.severity] += 1;
      return counts;
    },
    { blocker: 0, review: 0 }
  );
}

function blocker(scope, title, remediation) {
  return { severity: "blocker", scope, title, remediation };
}

function review(scope, title, remediation) {
  return { severity: "review", scope, title, remediation };
}

function signAttestation(payload, secret = DEFAULT_SECRET) {
  const canonicalPayload = stableStringify(payload);
  const digestValue = crypto.createHash("sha256").update(canonicalPayload).digest("hex");
  const signature = crypto.createHmac("sha256", secret).update(digestValue).digest("hex");

  return {
    ...payload,
    digest: digestValue,
    signature
  };
}

function digest(payload) {
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function isSemver(version) {
  return /^\d+\.\d+\.\d+$/.test(version || "");
}

function majorVersion(version) {
  if (!isSemver(version)) {
    return 0;
  }

  return Number(version.split(".")[0]);
}

module.exports = {
  evaluateMigrationBook,
  evaluateRepositoryMigration,
  signAttestation,
  stableStringify,
  digest,
  isSemver
};
