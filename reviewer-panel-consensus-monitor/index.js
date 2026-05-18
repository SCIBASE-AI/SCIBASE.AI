const crypto = require("node:crypto");

function evaluateReviewerPanel(panel) {
  const normalized = normalizePanel(panel);
  const findings = [
    ...findReviewerConflicts(normalized),
    ...findIndependenceGaps(normalized),
    ...findUnlockedSubmissionManifest(normalized),
    ...findScoreVariance(normalized),
    ...findFeedbackGaps(normalized),
    ...findDecisionExplanationGaps(normalized)
  ];

  const severityCounts = countSeverities(findings);
  const averageScore = scorePanelAverage(normalized);
  const summary = {
    challengeTitle: normalized.challengeTitle,
    phase: normalized.phase,
    findingCount: findings.length,
    severityCounts,
    averageScore,
    consensusQuality: scoreConsensusQuality(findings, averageScore, normalized.rubric),
    panelDecision: decidePanel(severityCounts, averageScore, normalized.rubric)
  };

  return {
    summary,
    findings,
    arbitrationPacket: buildArbitrationPacket(normalized, summary, findings)
  };
}

function normalizePanel(panel) {
  if (!panel || typeof panel !== "object") {
    throw new TypeError("evaluateReviewerPanel expects a panel object");
  }

  return {
    challengeTitle: panel.challengeTitle || "Untitled scientific bounty challenge",
    phase: panel.phase || "unlabeled review phase",
    submission: panel.submission || {},
    rubric: {
      version: panel.rubric?.version || "unversioned",
      criteria: Array.isArray(panel.rubric?.criteria) ? panel.rubric.criteria : [],
      decisionThreshold: Number(panel.rubric?.decisionThreshold || 0),
      maxScoreVariance: Number(panel.rubric?.maxScoreVariance || 15)
    },
    reviewers: Array.isArray(panel.reviewers) ? panel.reviewers : [],
    decision: panel.decision || {}
  };
}

function findReviewerConflicts(panel) {
  const conflicted = panel.reviewers
    .filter((reviewer) => safeArray(reviewer.conflicts).length > 0)
    .map(
      (reviewer) =>
        `${reviewer.id || "unknown reviewer"} has conflicts: ${safeArray(reviewer.conflicts).join(", ")}`
    );

  if (conflicted.length === 0) return [];

  return [
    finding({
      type: "reviewer_conflict",
      severity: "critical",
      title: "Reviewer panel includes declared conflicts of interest",
      evidence: conflicted,
      remediation:
        "Replace conflicted reviewers or quarantine their scores before phase advancement or payout recommendation."
    })
  ];
}

function findIndependenceGaps(panel) {
  const independentReviewers = panel.reviewers.filter(
    (reviewer) => reviewer.type === "independent" && safeArray(reviewer.conflicts).length === 0
  );
  const missingExpertise = panel.reviewers
    .filter((reviewer) => safeArray(reviewer.expertise).length === 0)
    .map((reviewer) => reviewer.id || "unknown reviewer");
  const evidence = [];

  if (independentReviewers.length < 2) {
    evidence.push(`only ${independentReviewers.length} unconflicted independent reviewer(s) are assigned`);
  }
  if (missingExpertise.length > 0) {
    evidence.push(`reviewers missing expertise tags: ${missingExpertise.join(", ")}`);
  }

  if (evidence.length === 0) return [];

  return [
    finding({
      type: "independence_gap",
      severity: "high",
      title: "Reviewer panel lacks enough independent, expertise-tagged review capacity",
      evidence,
      remediation:
        "Add at least two unconflicted independent reviewers with domain expertise before issuing an award decision."
    })
  ];
}

function findUnlockedSubmissionManifest(panel) {
  const hashes = safeArray(panel.submission.artifactHashes);
  const evidence = [];

  if (hashes.length === 0) evidence.push("submission package does not list artifact hashes");
  if (!panel.submission.manifestLockedAt) {
    evidence.push("submission manifest lock timestamp is missing");
  }

  if (evidence.length === 0) return [];

  return [
    finding({
      type: "unlocked_submission_manifest",
      severity: "high",
      title: "Submission evidence is not locked before review",
      evidence,
      remediation:
        "Lock the submission manifest with artifact hashes before reviewers score the package."
    })
  ];
}

function findScoreVariance(panel) {
  const reviewerAverages = panel.reviewers.map((reviewer) => averageReviewerScore(reviewer, panel.rubric.criteria));
  const validAverages = reviewerAverages.filter(Number.isFinite);

  if (validAverages.length < 2) return [];

  const spread = Math.max(...validAverages) - Math.min(...validAverages);
  if (spread <= panel.rubric.maxScoreVariance) return [];

  return [
    finding({
      type: "score_variance",
      severity: "medium",
      title: "Reviewer scores are too far apart for consensus",
      evidence: [
        `score spread ${round(spread)} exceeds allowed variance ${panel.rubric.maxScoreVariance}`,
        `reviewer averages: ${validAverages.map(round).join(", ")}`
      ],
      remediation:
        "Trigger a calibration discussion or arbitration review before advancing the submission."
    })
  ];
}

function findFeedbackGaps(panel) {
  const reviewersWithoutFeedback = panel.reviewers
    .filter((reviewer) => !String(reviewer.feedback || "").trim())
    .map((reviewer) => reviewer.id || "unknown reviewer");

  if (reviewersWithoutFeedback.length === 0) return [];

  return [
    finding({
      type: "feedback_gap",
      severity: "medium",
      title: "Reviewer feedback is missing for one or more scores",
      evidence: [`missing feedback from: ${reviewersWithoutFeedback.join(", ")}`],
      remediation:
        "Require reviewer-facing rationale so solvers and arbitrators can understand the score basis."
    })
  ];
}

function findDecisionExplanationGaps(panel) {
  const evidence = [];
  if (!String(panel.decision.proposedOutcome || "").trim()) {
    evidence.push("proposed outcome is missing");
  }
  if (!String(panel.decision.explanation || "").trim()) {
    evidence.push("decision explanation is missing");
  }
  if (!String(panel.decision.reviewerResponsesDueAt || "").trim()) {
    evidence.push("reviewer response deadline is missing");
  }

  if (evidence.length === 0) return [];

  return [
    finding({
      type: "decision_explanation_gap",
      severity: "medium",
      title: "Panel decision lacks arbitration-ready explanation metadata",
      evidence,
      remediation:
        "Record the proposed outcome, reasoning, and reviewer response deadline before sponsor payout action."
    })
  ];
}

function buildArbitrationPacket(panel, summary, findings) {
  return {
    challengeTitle: panel.challengeTitle,
    submissionId: panel.submission.id || "unknown-submission",
    teamId: panel.submission.teamId || "unknown-team",
    phase: panel.phase,
    rubricVersion: panel.rubric.version,
    digest: digestPanel(panel, findings),
    reviewerCount: panel.reviewers.length,
    independentReviewerCount: panel.reviewers.filter((reviewer) => reviewer.type === "independent").length,
    requiredActions:
      findings.length === 0
        ? ["Proceed with sponsor award or phase advancement."]
        : findings.map((finding) => finding.remediation),
    decisionSummary: `${summary.panelDecision} with ${summary.consensusQuality} consensus quality`
  };
}

function scorePanelAverage(panel) {
  const scores = panel.reviewers
    .map((reviewer) => averageReviewerScore(reviewer, panel.rubric.criteria))
    .filter(Number.isFinite);

  if (scores.length === 0) return 0;
  return round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function averageReviewerScore(reviewer, criteria) {
  const scores = criteria
    .map((criterion) => Number(reviewer.scores?.[criterion]))
    .filter(Number.isFinite);

  if (scores.length === 0) return NaN;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function scoreConsensusQuality(findings, averageScore, rubric) {
  if (findings.some((finding) => finding.severity === "critical" || finding.severity === "high")) {
    return "low";
  }
  if (findings.length > 0 || averageScore < rubric.decisionThreshold) return "medium";
  return "high";
}

function decidePanel(severityCounts, averageScore, rubric) {
  if ((severityCounts.critical || 0) > 0 || (severityCounts.high || 0) > 0) return "block";
  if ((severityCounts.medium || 0) > 0 || averageScore < rubric.decisionThreshold) {
    return "needs-arbitration";
  }
  return "approve";
}

function countSeverities(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {});
}

function finding({ type, severity, title, evidence, remediation }) {
  return {
    id: `${type}:${crypto.createHash("sha1").update(evidence.join("|")).digest("hex").slice(0, 10)}`,
    type,
    severity,
    title,
    evidence,
    remediation
  };
}

function digestPanel(panel, findings) {
  const payload = {
    submission: panel.submission,
    rubric: panel.rubric,
    reviewers: panel.reviewers.map((reviewer) => ({
      id: reviewer.id,
      type: reviewer.type,
      expertise: reviewer.expertise,
      conflicts: reviewer.conflicts,
      scores: reviewer.scores
    })),
    findingTypes: findings.map((finding) => finding.type)
  };

  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function round(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  evaluateReviewerPanel
};
