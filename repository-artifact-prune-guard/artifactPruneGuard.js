"use strict";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(olderIso, newerIso) {
  return Math.floor((Date.parse(newerIso) - Date.parse(olderIso)) / DAY_MS);
}

function indexReferences(references) {
  const byArtifact = new Map();

  for (const group of references) {
    for (const item of group.artifacts) {
      const entries = byArtifact.get(item.id) || [];
      entries.push({
        source: group.source,
        sourceType: group.sourceType,
        requiredHash: item.hash || null,
        severity: group.severity || "blocker",
      });
      byArtifact.set(item.id, entries);
    }
  }

  return byArtifact;
}

function artifactLabel(artifact) {
  return `${artifact.id} (${artifact.path})`;
}

function analyzeArtifactPrunePlan(input) {
  const now = input.now || new Date().toISOString();
  const retentionDays = input.policy?.minimumUnreferencedAgeDays ?? 30;
  const candidateIds = new Set(input.pruneCandidates || []);
  const referencesByArtifact = indexReferences(input.references || []);

  const artifactsById = new Map(input.artifacts.map((artifact) => [artifact.id, artifact]));
  const missingCandidates = [...candidateIds].filter((id) => !artifactsById.has(id));

  const approvedPrunes = [];
  const blockedPrunes = [];
  const warnings = [];

  for (const artifact of input.artifacts) {
    if (!candidateIds.has(artifact.id)) {
      continue;
    }

    const ageDays = daysBetween(artifact.lastReferencedAt || artifact.createdAt, now);
    const references = referencesByArtifact.get(artifact.id) || [];
    const blockers = [];

    for (const reference of references) {
      if (reference.requiredHash && reference.requiredHash !== artifact.hash) {
        blockers.push({
          code: "REFERENCE_HASH_DRIFT",
          message: `${reference.source} expects ${reference.requiredHash} but ${artifact.id} is ${artifact.hash}`,
          source: reference.source,
        });
        continue;
      }

      blockers.push({
        code: referenceCode(reference.sourceType),
        message: `${artifactLabel(artifact)} is still required by ${reference.source}`,
        source: reference.source,
      });
    }

    if (artifact.retentionHold) {
      blockers.push({
        code: "RETENTION_HOLD",
        message: `${artifactLabel(artifact)} has an active retention hold: ${artifact.retentionHold}`,
        source: "repository policy",
      });
    }

    if (ageDays < retentionDays) {
      blockers.push({
        code: "MINIMUM_AGE_NOT_MET",
        message: `${artifactLabel(artifact)} is ${ageDays} days old; policy requires ${retentionDays}`,
        source: "repository policy",
      });
    }

    if (blockers.length > 0) {
      blockedPrunes.push({
        artifactId: artifact.id,
        path: artifact.path,
        blockers,
      });
    } else {
      approvedPrunes.push({
        artifactId: artifact.id,
        path: artifact.path,
        reason: `unreferenced for ${ageDays} days and no release evidence depends on it`,
      });
    }
  }

  for (const id of missingCandidates) {
    warnings.push({
      code: "UNKNOWN_CANDIDATE",
      message: `Prune candidate ${id} is not present in the repository artifact inventory`,
    });
  }

  const status = blockedPrunes.length === 0 && missingCandidates.length === 0 ? "pass" : "blocked";

  return {
    status,
    checkedAt: now,
    policy: {
      minimumUnreferencedAgeDays: retentionDays,
    },
    summary: {
      candidates: candidateIds.size,
      approved: approvedPrunes.length,
      blocked: blockedPrunes.length,
      warnings: warnings.length,
    },
    approvedPrunes,
    blockedPrunes,
    warnings,
  };
}

function referenceCode(sourceType) {
  switch (sourceType) {
    case "citation":
      return "CITATION_EVIDENCE_BOUND";
    case "doi":
      return "DOI_VERSION_BOUND";
    case "export":
      return "EXPORT_MANIFEST_BOUND";
    case "reproducibility":
      return "REPRODUCIBILITY_PACKET_BOUND";
    default:
      return "REPOSITORY_REFERENCE_BOUND";
  }
}

module.exports = {
  analyzeArtifactPrunePlan,
  daysBetween,
};
