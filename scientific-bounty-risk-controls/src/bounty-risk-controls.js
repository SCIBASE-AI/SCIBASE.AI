"use strict";

const crypto = require("node:crypto");

const REQUIRED_FIELDS = ["challenge", "teams", "submissions", "reviewers", "assignments"];
const DEFAULTS = {
  duplicateSimilarityThreshold: 0.72,
  suspiciousNetworkReuseThreshold: 2,
  burstWindowMinutes: 20,
  burstSubmissionThreshold: 3,
};

function assertBundle(bundle) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    throw new TypeError("risk-control bundle must be an object");
  }

  for (const field of REQUIRED_FIELDS) {
    if (!Array.isArray(bundle[field]) && field !== "challenge") {
      throw new TypeError(`missing required bundle array: ${field}`);
    }
    if (field === "challenge" && (!bundle.challenge || typeof bundle.challenge !== "object")) {
      throw new TypeError("missing required bundle field: challenge");
    }
  }
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value) {
  const tokens = normalizeText(value)
    .split(" ")
    .map((token) => (token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token))
    .filter((token) => token.length > 2);
  return new Set(tokens);
}

function jaccardSimilarity(left, right) {
  const leftSet = tokenSet(left);
  const rightSet = tokenSet(right);
  const all = new Set([...leftSet, ...rightSet]);
  if (all.size === 0) return 0;

  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) intersection += 1;
  }
  return Number((intersection / all.size).toFixed(4));
}

function stableHash(value) {
  return crypto
    .createHash("sha256")
    .update(stableStringify(value))
    .digest("hex");
}

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

function contentFingerprint(submission) {
  const artifactHashes = (submission.artifacts || []).map((artifact) => artifact.hash).filter(Boolean).sort();
  const text = normalizeText([
    submission.title,
    submission.abstract,
    submission.methodsSummary,
    submission.deliverableManifest,
  ].join(" "));

  return stableHash({
    artifactHashes,
    text,
  });
}

function buildTeamIndex(teams) {
  const index = new Map();
  for (const team of teams) {
    index.set(team.id, team);
  }
  return index;
}

function buildReviewerIndex(reviewers) {
  const index = new Map();
  for (const reviewer of reviewers) {
    index.set(reviewer.id, reviewer);
  }
  return index;
}

function compareSubmissions(submissions, options = {}) {
  const threshold = options.duplicateSimilarityThreshold || DEFAULTS.duplicateSimilarityThreshold;
  const findings = [];

  for (let i = 0; i < submissions.length; i += 1) {
    for (let j = i + 1; j < submissions.length; j += 1) {
      const left = submissions[i];
      const right = submissions[j];
      const sharedArtifactHashes = sharedHashes(left.artifacts || [], right.artifacts || []);
      const methodSimilarity = jaccardSimilarity(left.methodsSummary, right.methodsSummary);
      const manifestSimilarity = jaccardSimilarity(left.deliverableManifest, right.deliverableManifest);
      const titleSimilarity = jaccardSimilarity(left.title, right.title);
      const weightedSimilarity = Number(
        ((methodSimilarity * 0.5) + (manifestSimilarity * 0.35) + (titleSimilarity * 0.15)).toFixed(4)
      );

      if (sharedArtifactHashes.length > 0 || weightedSimilarity >= threshold) {
        findings.push({
          code: sharedArtifactHashes.length > 0 ? "shared-artifact-hash" : "high-text-similarity",
          severity: sharedArtifactHashes.length > 0 ? "high" : "medium",
          submissionIds: [left.id, right.id],
          teamIds: [left.teamId, right.teamId],
          weightedSimilarity,
          sharedArtifactHashes,
          summary: sharedArtifactHashes.length > 0
            ? "Submissions reuse one or more artifact hashes and require duplicate-work review."
            : "Submissions have unusually similar title, method, and deliverable text.",
        });
      }
    }
  }

  return findings;
}

function sharedHashes(leftArtifacts, rightArtifacts) {
  const right = new Set(rightArtifacts.map((artifact) => artifact.hash).filter(Boolean));
  return leftArtifacts
    .map((artifact) => artifact.hash)
    .filter((hash) => hash && right.has(hash));
}

function detectRelationshipConflicts(challenge, team, reviewer, assignment) {
  const reasons = [];
  const members = team.members || [];
  const memberInstitutions = new Set(members.map((member) => member.institution).filter(Boolean));
  const memberIds = new Set(members.map((member) => member.id));
  const reviewerCollaborators = new Set(reviewer.priorCollaboratorIds || []);
  const reviewerFinancialSponsors = new Set(reviewer.financialSponsorIds || []);
  const reviewerInstitutions = new Set(reviewer.institutions || []);

  if (reviewer.sponsorEmployee === true || reviewer.employerId === challenge.sponsorId) {
    reasons.push({
      code: "sponsor-employee-reviewer",
      severity: "high",
      summary: "Assigned reviewer is employed by the challenge sponsor.",
    });
  }

  for (const institution of memberInstitutions) {
    if (reviewerInstitutions.has(institution)) {
      reasons.push({
        code: "shared-institution",
        severity: "medium",
        summary: `Reviewer shares institution ${institution} with a solver team member.`,
      });
    }
  }

  for (const memberId of memberIds) {
    if (reviewerCollaborators.has(memberId)) {
      reasons.push({
        code: "recent-collaboration",
        severity: "high",
        summary: "Reviewer has a recent collaboration with a solver team member.",
      });
    }
  }

  if (reviewerFinancialSponsors.has(challenge.sponsorId)) {
    reasons.push({
      code: "sponsor-financial-interest",
      severity: "high",
      summary: "Reviewer has a financial relationship with the challenge sponsor.",
    });
  }

  if (assignment.role === "arbitrator" && reasons.some((reason) => reason.severity === "high")) {
    reasons.push({
      code: "arbitrator-hard-block",
      severity: "high",
      summary: "High-severity conflicts block arbitrator assignment.",
    });
  }

  return reasons;
}

function evaluateAssignments(bundle) {
  const teamIndex = buildTeamIndex(bundle.teams);
  const reviewerIndex = buildReviewerIndex(bundle.reviewers);
  const submissionIndex = new Map(bundle.submissions.map((submission) => [submission.id, submission]));
  const findings = [];

  for (const assignment of bundle.assignments) {
    const submission = submissionIndex.get(assignment.submissionId);
    const reviewer = reviewerIndex.get(assignment.reviewerId);
    if (!submission || !reviewer) {
      findings.push({
        code: "assignment-reference-missing",
        severity: "high",
        assignment,
        summary: "Assignment references a missing submission or reviewer.",
      });
      continue;
    }

    const team = teamIndex.get(submission.teamId);
    if (!team) {
      findings.push({
        code: "assignment-team-missing",
        severity: "high",
        submissionId: submission.id,
        teamId: submission.teamId,
        summary: "Submission references a missing solver team.",
      });
      continue;
    }

    const reasons = detectRelationshipConflicts(bundle.challenge, team, reviewer, assignment);
    for (const reason of reasons) {
      findings.push({
        ...reason,
        assignmentId: assignment.id,
        submissionId: submission.id,
        teamId: team.id,
        reviewerId: reviewer.id,
      });
    }
  }

  return findings;
}

function detectTimingAndNetworkSignals(submissions, options = {}) {
  const networkThreshold = options.suspiciousNetworkReuseThreshold || DEFAULTS.suspiciousNetworkReuseThreshold;
  const burstWindowMinutes = options.burstWindowMinutes || DEFAULTS.burstWindowMinutes;
  const burstSubmissionThreshold = options.burstSubmissionThreshold || DEFAULTS.burstSubmissionThreshold;
  const findings = [];
  const byNetwork = new Map();

  for (const submission of submissions) {
    if (!submission.anonymizedNetworkId) continue;
    const items = byNetwork.get(submission.anonymizedNetworkId) || [];
    items.push(submission);
    byNetwork.set(submission.anonymizedNetworkId, items);
  }

  for (const [networkId, items] of byNetwork.entries()) {
    const teamIds = new Set(items.map((item) => item.teamId));
    if (teamIds.size >= networkThreshold) {
      findings.push({
        code: "shared-anonymized-network",
        severity: "medium",
        networkId,
        submissionIds: items.map((item) => item.id),
        teamIds: [...teamIds],
        summary: "Multiple solver teams submitted from the same anonymized network fingerprint.",
      });
    }
  }

  const sorted = [...submissions]
    .filter((submission) => submission.submittedAt)
    .sort((left, right) => new Date(left.submittedAt) - new Date(right.submittedAt));

  for (let start = 0; start < sorted.length; start += 1) {
    const windowStart = new Date(sorted[start].submittedAt).getTime();
    const burst = [];
    for (let end = start; end < sorted.length; end += 1) {
      const elapsedMinutes = (new Date(sorted[end].submittedAt).getTime() - windowStart) / 60000;
      if (elapsedMinutes > burstWindowMinutes) break;
      burst.push(sorted[end]);
    }
    const teams = new Set(burst.map((submission) => submission.teamId));
    if (burst.length >= burstSubmissionThreshold && teams.size >= burstSubmissionThreshold) {
      findings.push({
        code: "submission-burst",
        severity: "low",
        windowMinutes: burstWindowMinutes,
        submissionIds: burst.map((submission) => submission.id),
        teamIds: [...teams],
        summary: "Several independent teams submitted inside a short window and should be spot-checked for coordination.",
      });
      break;
    }
  }

  return findings;
}

function riskScoreForSubmission(submission, findings) {
  const relevant = findings.filter((finding) =>
    finding.submissionId === submission.id || (finding.submissionIds || []).includes(submission.id)
  );
  const score = relevant.reduce((total, finding) => {
    if (finding.severity === "high") return total + 45;
    if (finding.severity === "medium") return total + 25;
    return total + 10;
  }, 0);

  return Math.min(100, score);
}

function payoutDecisionForSubmission(submission, findings) {
  const score = riskScoreForSubmission(submission, findings);
  const relevant = findings.filter((finding) =>
    finding.submissionId === submission.id || (finding.submissionIds || []).includes(submission.id)
  );
  const highSeverity = relevant.some((finding) => finding.severity === "high");
  const duplicate = relevant.some((finding) =>
    finding.code === "shared-artifact-hash" || finding.code === "high-text-similarity"
  );

  let status = "release-ready";
  if (highSeverity || score >= 70) {
    status = "hold-for-arbitration";
  } else if (duplicate || score >= 35) {
    status = "manual-review";
  }

  return {
    submissionId: submission.id,
    teamId: submission.teamId,
    payoutStatus: status,
    riskScore: score,
    holdReasons: relevant.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      summary: finding.summary,
    })),
  };
}

function analyzeScientificBountyRisk(bundle, options = {}) {
  assertBundle(bundle);

  const normalizedOptions = {
    ...DEFAULTS,
    ...options,
  };
  const duplicateFindings = compareSubmissions(bundle.submissions, normalizedOptions);
  const assignmentFindings = evaluateAssignments(bundle);
  const timingFindings = detectTimingAndNetworkSignals(bundle.submissions, normalizedOptions);
  const findings = [...duplicateFindings, ...assignmentFindings, ...timingFindings];
  const payoutDecisions = bundle.submissions.map((submission) => payoutDecisionForSubmission(submission, findings));
  const arbitrationQueue = payoutDecisions
    .filter((decision) => decision.payoutStatus !== "release-ready")
    .sort((left, right) => right.riskScore - left.riskScore);

  const submissionFingerprints = bundle.submissions.map((submission) => ({
    submissionId: submission.id,
    fingerprint: contentFingerprint(submission),
  }));

  const report = {
    challengeId: bundle.challenge.id,
    sponsorId: bundle.challenge.sponsorId,
    generatedAt: bundle.generatedAt || new Date().toISOString(),
    summary: {
      submissions: bundle.submissions.length,
      findings: findings.length,
      duplicateFindings: duplicateFindings.length,
      conflictFindings: assignmentFindings.length,
      timingFindings: timingFindings.length,
      releaseReady: payoutDecisions.filter((decision) => decision.payoutStatus === "release-ready").length,
      manualReview: payoutDecisions.filter((decision) => decision.payoutStatus === "manual-review").length,
      holdForArbitration: payoutDecisions.filter((decision) => decision.payoutStatus === "hold-for-arbitration").length,
    },
    duplicateFindings,
    conflictFindings: assignmentFindings,
    timingFindings,
    payoutDecisions,
    arbitrationQueue,
    submissionFingerprints,
  };

  return {
    ...report,
    auditDigest: stableHash({
      challengeId: report.challengeId,
      findings,
      payoutDecisions,
      submissionFingerprints,
    }),
  };
}

module.exports = {
  analyzeScientificBountyRisk,
  compareSubmissions,
  contentFingerprint,
  detectRelationshipConflicts,
  detectTimingAndNetworkSignals,
  jaccardSimilarity,
  payoutDecisionForSubmission,
  riskScoreForSubmission,
  stableHash,
  stableStringify,
};
