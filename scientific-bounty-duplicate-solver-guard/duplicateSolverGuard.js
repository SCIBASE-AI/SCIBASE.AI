"use strict";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeId(value) {
  return normalizeText(value).replace(/^@/, "");
}

function jaccard(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size === 0 && b.size === 0) {
    return 1;
  }

  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) {
      intersection += 1;
    }
  }

  return intersection / new Set([...a, ...b]).size;
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function artifactFingerprint(submission) {
  const hashes = (submission.artifacts || []).map((artifact) => normalizeText(artifact.sha256 || artifact.hash));
  return hashes.filter(Boolean).sort();
}

function collectPaymentRoutes(submission) {
  return (submission.paymentRoutes || [])
    .map((route) => `${normalizeText(route.network)}:${normalizeText(route.account)}`)
    .filter((route) => route !== ":");
}

function analyzeDuplicateSolverRisk(input) {
  const policy = {
    maxSubmissionSimilarity: input.policy?.maxSubmissionSimilarity ?? 0.72,
    maxSharedArtifactRatio: input.policy?.maxSharedArtifactRatio ?? 0.35,
  };

  const submissions = input.submissions || [];
  const warnings = [];
  const blocked = [];
  const review = [];
  const pass = [];

  const bySolver = new Map();
  const byTeam = new Map();
  const byPaymentRoute = new Map();
  const seenPairs = new Set();

  for (const submission of submissions) {
    for (const solver of submission.solvers || []) {
      const solverId = normalizeId(solver.id || solver.handle || solver.email);
      if (!solverId) {
        continue;
      }
      const entries = bySolver.get(solverId) || [];
      entries.push(submission.id);
      bySolver.set(solverId, entries);
    }

    for (const teamId of submission.teamIds || []) {
      const normalizedTeamId = normalizeId(teamId);
      const entries = byTeam.get(normalizedTeamId) || [];
      entries.push(submission.id);
      byTeam.set(normalizedTeamId, entries);
    }

    for (const route of collectPaymentRoutes(submission)) {
      const entries = byPaymentRoute.get(route) || [];
      entries.push(submission.id);
      byPaymentRoute.set(route, entries);
    }
  }

  for (const [solverId, ids] of bySolver.entries()) {
    if (ids.length > 1) {
      blocked.push({
        code: "SOLVER_MULTI_SUBMISSION",
        severity: "blocker",
        submissionIds: ids,
        message: `Solver ${solverId} appears on multiple submissions for the same bounty phase.`,
      });
    }
  }

  for (const [teamId, ids] of byTeam.entries()) {
    if (ids.length > 1) {
      blocked.push({
        code: "TEAM_MULTI_SUBMISSION",
        severity: "blocker",
        submissionIds: ids,
        message: `Team ${teamId} submitted more than once in this challenge phase.`,
      });
    }
  }

  for (const [route, ids] of byPaymentRoute.entries()) {
    if (ids.length > 1) {
      review.push({
        code: "PAYMENT_ROUTE_REUSED",
        severity: "review",
        submissionIds: ids,
        message: `Payment route ${route} is shared by multiple submissions and needs sponsor review.`,
      });
    }
  }

  for (let i = 0; i < submissions.length; i += 1) {
    for (let j = i + 1; j < submissions.length; j += 1) {
      const left = submissions[i];
      const right = submissions[j];
      const key = [left.id, right.id].sort().join("|");
      if (seenPairs.has(key)) {
        continue;
      }
      seenPairs.add(key);

      const artifactOverlap = jaccard(artifactFingerprint(left), artifactFingerprint(right));
      const textSimilarity = jaccard(
        tokenize(`${left.abstract || ""} ${left.deliverablesSummary || ""}`),
        tokenize(`${right.abstract || ""} ${right.deliverablesSummary || ""}`),
      );

      if (artifactOverlap > policy.maxSharedArtifactRatio) {
        blocked.push({
          code: "ARTIFACT_HASH_OVERLAP",
          severity: "blocker",
          submissionIds: [left.id, right.id],
          score: Number(artifactOverlap.toFixed(3)),
          message: `${left.id} and ${right.id} share too many artifact hashes for independent scoring.`,
        });
      } else if (textSimilarity >= policy.maxSubmissionSimilarity) {
        review.push({
          code: "HIGH_TEXT_SIMILARITY",
          severity: "review",
          submissionIds: [left.id, right.id],
          score: Number(textSimilarity.toFixed(3)),
          message: `${left.id} and ${right.id} have unusually similar summaries.`,
        });
      }
    }
  }

  const flaggedIds = new Set(
    [...blocked, ...review].flatMap((finding) => finding.submissionIds || []),
  );

  for (const submission of submissions) {
    if (!flaggedIds.has(submission.id)) {
      pass.push({
        submissionId: submission.id,
        decision: "eligible_for_scoring",
      });
    }
  }

  if (submissions.length === 0) {
    warnings.push({
      code: "NO_SUBMISSIONS",
      message: "No submissions were available for duplicate-solver analysis.",
    });
  }

  return {
    status: blocked.length > 0 ? "blocked" : review.length > 0 ? "review" : "pass",
    checkedAt: input.checkedAt || new Date().toISOString(),
    policy,
    summary: {
      submissions: submissions.length,
      blockers: blocked.length,
      reviewItems: review.length,
      eligible: pass.length,
      warnings: warnings.length,
    },
    blocked,
    review,
    pass,
    warnings,
  };
}

module.exports = {
  analyzeDuplicateSolverRisk,
  artifactFingerprint,
  collectPaymentRoutes,
  jaccard,
  normalizeId,
  tokenize,
};
