"use strict";

const crypto = require("node:crypto");

const DEFAULT_SECRET = "scibase-artifact-storage-dedup-demo-secret";
const LARGE_ARTIFACT_BYTES = 512 * 1024 * 1024;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function evaluateStorageBook(book, options = {}) {
  if (!book || typeof book !== "object") {
    throw new Error("A storage book object is required.");
  }

  const asOf = normalizeDate(book.asOf);
  const projects = (book.projects || []).map((project) => evaluateProject(project, book.storageTiers || {}, asOf));
  const summary = summarizeProjects(projects);
  const adminMetrics = buildAdminMetrics(projects);
  const auditEvents = projects.map((project) =>
    signAuditEvent(
      {
        type: "artifact.storage_dedup.evaluated",
        asOf: book.asOf,
        projectId: project.projectId,
        storageDecision: project.storageDecision,
        logicalBytes: project.logicalBytes,
        physicalBytesAfterDedup: project.physicalBytesAfterDedup,
        quotaBytes: project.quotaBytes,
        dedupSavingsBytes: project.dedupSavingsBytes,
        blockers: project.actionCounts.blocker,
        reviews: project.actionCounts.review
      },
      options.secret || DEFAULT_SECRET
    )
  );

  return {
    schemaVersion: "2026-05-16.scientific-artifact-storage-dedup-ledger.v1",
    asOf: book.asOf,
    storageTiers: book.storageTiers || {},
    summary,
    adminMetrics,
    projects,
    auditEvents
  };
}

function evaluateProject(project, storageTiers, asOf) {
  const artifacts = project.artifacts || [];
  const logicalBytes = sum(artifacts.map((artifact) => artifact.sizeBytes));
  const blobs = buildBlobInventory(artifacts);
  const physicalBytesAfterDedup = sum(blobs.map((blob) => blob.sizeBytes));
  const dedupSavingsBytes = logicalBytes - physicalBytesAfterDedup;
  const actions = [
    ...checkHashEvidence(artifacts),
    ...checkQuota(project, physicalBytesAfterDedup),
    ...checkLargeArtifactRouting(artifacts),
    ...checkPreviewInvalidation(artifacts),
    ...checkRetention(project, artifacts, asOf)
  ];
  const actionCounts = countActions(actions);
  const storageDecision = decideStorage(actionCounts);
  const tierPlan = artifacts.map((artifact) => ({
    artifactId: artifact.artifactId,
    path: artifact.path,
    tier: chooseTier(artifact, storageTiers, asOf),
    reason: tierReason(artifact, asOf)
  }));

  return {
    projectId: project.projectId,
    title: project.title,
    quotaBytes: project.quotaBytes,
    logicalBytes,
    physicalBytesAfterDedup,
    dedupSavingsBytes,
    dedupSavingsPercent: logicalBytes ? Math.round((dedupSavingsBytes / logicalBytes) * 100) : 0,
    storageDecision,
    actionCounts,
    blobs,
    actions,
    tierPlan,
    auditDigest: digest({ projectId: project.projectId, blobs, actions, tierPlan })
  };
}

function buildBlobInventory(artifacts) {
  const byHash = new Map();
  const unverifiedBlobs = [];

  for (const artifact of artifacts) {
    if (!artifact.contentHash) {
      unverifiedBlobs.push({
        contentHash: `unverified:${artifact.artifactId}`,
        sizeBytes: artifact.sizeBytes,
        references: [
          {
            artifactId: artifact.artifactId,
            path: artifact.path,
            version: artifact.version
          }
        ],
        duplicateReferences: 0,
        savingsBytes: 0,
        verified: false
      });
      continue;
    }

    if (!byHash.has(artifact.contentHash)) {
      byHash.set(artifact.contentHash, {
        contentHash: artifact.contentHash,
        sizeBytes: artifact.sizeBytes,
        references: []
      });
    }

    byHash.get(artifact.contentHash).references.push({
      artifactId: artifact.artifactId,
      path: artifact.path,
      version: artifact.version
    });
  }

  return [
    ...Array.from(byHash.values()).map((blob) => ({
      ...blob,
      duplicateReferences: Math.max(0, blob.references.length - 1),
      savingsBytes: Math.max(0, blob.references.length - 1) * blob.sizeBytes,
      verified: true
    })),
    ...unverifiedBlobs
  ];
}

function checkHashEvidence(artifacts) {
  return artifacts
    .filter((artifact) => !artifact.contentHash)
    .map((artifact) =>
      blocker(
        "content-hash",
        `${artifact.path} is missing content hash evidence`,
        "Generate a SHA-256 content hash before deduplication or release."
      )
    );
}

function checkQuota(project, physicalBytesAfterDedup) {
  if (physicalBytesAfterDedup > project.quotaBytes) {
    return [
      blocker(
        "quota",
        `Physical storage exceeds quota by ${physicalBytesAfterDedup - project.quotaBytes} bytes`,
        "Archive older versions, increase quota, or split raw artifacts into a governed cold tier."
      )
    ];
  }

  if (physicalBytesAfterDedup > project.quotaBytes * 0.85) {
    return [
      review(
        "quota",
        "Project is above 85% of storage quota",
        "Review tiering and retention before the next large upload."
      )
    ];
  }

  return [];
}

function checkLargeArtifactRouting(artifacts) {
  return artifacts
    .filter((artifact) => artifact.sizeBytes >= LARGE_ARTIFACT_BYTES && artifact.kind !== "raw-instrument-output")
    .map((artifact) =>
      review(
        "large-artifact-routing",
        `${artifact.path} should use large-artifact object storage routing`,
        "Route large models and generated assets through the object-store/LFS path."
      )
    );
}

function checkPreviewInvalidation(artifacts) {
  return artifacts
    .filter((artifact) => artifact.previewStatus === "stale")
    .map((artifact) =>
      review(
        "preview",
        `${artifact.path} has a stale preview`,
        "Invalidate and rebuild the metadata-aware preview before reviewer export."
      )
    );
}

function checkRetention(project, artifacts, asOf) {
  const policy = project.retentionPolicy || {};
  const archiveAfterDays = policy.archiveAfterDays || 90;

  return artifacts
    .filter((artifact) => daysSince(asOf, artifact.lastAccessedAt) > archiveAfterDays)
    .map((artifact) =>
      review(
        "retention",
        `${artifact.path} has not been accessed for ${daysSince(asOf, artifact.lastAccessedAt)} day(s)`,
        "Move inactive artifacts to the configured cold tier or confirm retention exemption."
      )
    );
}

function chooseTier(artifact, storageTiers, asOf) {
  if (daysSince(asOf, artifact.lastAccessedAt) > 90) {
    return "cold";
  }

  if (artifact.sizeBytes > (storageTiers.hot && storageTiers.hot.maxBytes ? storageTiers.hot.maxBytes : LARGE_ARTIFACT_BYTES)) {
    return "warm";
  }

  if (artifact.kind === "notebook" || artifact.previewStatus === "valid") {
    return "hot";
  }

  return "warm";
}

function tierReason(artifact, asOf) {
  const inactiveDays = daysSince(asOf, artifact.lastAccessedAt);

  if (inactiveDays > 90) {
    return `inactive for ${inactiveDays} day(s)`;
  }

  if (artifact.sizeBytes >= LARGE_ARTIFACT_BYTES) {
    return "large artifact";
  }

  if (artifact.previewStatus === "valid") {
    return "active preview";
  }

  return "default warm storage";
}

function decideStorage(counts) {
  if (counts.blocker > 0) {
    return "blocked";
  }

  if (counts.review > 0) {
    return "needs_review";
  }

  return "ready";
}

function summarizeProjects(projects) {
  const summary = {
    totalProjects: projects.length,
    ready: 0,
    needsReview: 0,
    blocked: 0,
    logicalBytes: 0,
    physicalBytesAfterDedup: 0,
    dedupSavingsBytes: 0
  };

  for (const project of projects) {
    summary.ready += project.storageDecision === "ready" ? 1 : 0;
    summary.needsReview += project.storageDecision === "needs_review" ? 1 : 0;
    summary.blocked += project.storageDecision === "blocked" ? 1 : 0;
    summary.logicalBytes += project.logicalBytes;
    summary.physicalBytesAfterDedup += project.physicalBytesAfterDedup;
    summary.dedupSavingsBytes += project.dedupSavingsBytes;
  }

  summary.dedupSavingsPercent = summary.logicalBytes
    ? Math.round((summary.dedupSavingsBytes / summary.logicalBytes) * 100)
    : 0;
  return summary;
}

function buildAdminMetrics(projects) {
  return {
    dedupQueue: projects
      .filter((project) => project.dedupSavingsBytes > 0)
      .map((project) => ({
        projectId: project.projectId,
        savingsBytes: project.dedupSavingsBytes,
        savingsPercent: project.dedupSavingsPercent
      })),
    actionQueue: projects
      .filter((project) => project.storageDecision !== "ready")
      .map((project) => ({
        projectId: project.projectId,
        decision: project.storageDecision,
        actions: project.actions.map((action) => action.title)
      }))
  };
}

function blocker(scope, title, remediation) {
  return { severity: "blocker", scope, title, remediation };
}

function review(scope, title, remediation) {
  return { severity: "review", scope, title, remediation };
}

function countActions(actions) {
  return actions.reduce(
    (counts, action) => {
      counts[action.severity] += 1;
      return counts;
    },
    { blocker: 0, review: 0 }
  );
}

function signAuditEvent(payload, secret = DEFAULT_SECRET) {
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

function normalizeDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

function daysSince(asOf, dateValue) {
  return Math.floor((asOf.getTime() - normalizeDate(dateValue).getTime()) / MS_PER_DAY);
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

module.exports = {
  evaluateStorageBook,
  evaluateProject,
  buildBlobInventory,
  signAuditEvent,
  stableStringify,
  digest,
  daysSince
};
