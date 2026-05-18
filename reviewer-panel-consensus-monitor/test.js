const assert = require("node:assert/strict");
const { evaluateReviewerPanel } = require("./index.js");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const riskyPanel = {
  challengeTitle: "Open Biomarker Discovery Challenge",
  phase: "prototype review",
  submission: {
    id: "sub-2026-014",
    teamId: "team-alpha",
    artifactHashes: ["sha256:raw-data", "sha256:notebook"],
    manifestLockedAt: ""
  },
  rubric: {
    version: "v2.1",
    criteria: ["scientific rigor", "reproducibility", "clinical relevance"],
    decisionThreshold: 80,
    maxScoreVariance: 14
  },
  reviewers: [
    {
      id: "rev-001",
      type: "sponsor",
      expertise: ["clinical"],
      conflicts: ["same_institution"],
      scores: { "scientific rigor": 96, reproducibility: 94, "clinical relevance": 98 },
      feedback: ""
    },
    {
      id: "rev-002",
      type: "internal",
      expertise: [],
      conflicts: [],
      scores: { "scientific rigor": 44, reproducibility: 38, "clinical relevance": 51 },
      feedback: "Needs more evidence."
    }
  ],
  decision: {
    proposedOutcome: "advance",
    explanation: "",
    reviewerResponsesDueAt: ""
  }
};

const healthyPanel = {
  challengeTitle: "Climate Materials Prize",
  phase: "final award review",
  submission: {
    id: "sub-2026-088",
    teamId: "team-carbon",
    artifactHashes: ["sha256:model", "sha256:dataset", "sha256:report"],
    manifestLockedAt: "2026-05-18T16:40:00Z"
  },
  rubric: {
    version: "v3.0",
    criteria: ["scientific rigor", "reproducibility", "field impact"],
    decisionThreshold: 82,
    maxScoreVariance: 12
  },
  reviewers: [
    {
      id: "rev-independent-1",
      type: "independent",
      expertise: ["materials", "simulation"],
      conflicts: [],
      scores: { "scientific rigor": 87, reproducibility: 84, "field impact": 89 },
      feedback: "Evidence supports the award decision."
    },
    {
      id: "rev-independent-2",
      type: "independent",
      expertise: ["climate", "materials"],
      conflicts: [],
      scores: { "scientific rigor": 85, reproducibility: 86, "field impact": 88 },
      feedback: "Reproducibility packet is complete."
    },
    {
      id: "rev-sponsor-observer",
      type: "sponsor",
      expertise: ["deployment"],
      conflicts: [],
      scores: { "scientific rigor": 86, reproducibility: 83, "field impact": 90 },
      feedback: "Sponsor requirements are satisfied."
    }
  ],
  decision: {
    proposedOutcome: "award",
    explanation: "Independent reviewers reached consensus above the award threshold.",
    reviewerResponsesDueAt: "2026-05-22T12:00:00Z"
  }
};

test("blocks reviewer panels with conflicts, weak independence, unlocked evidence, variance, and missing explanation", () => {
  const result = evaluateReviewerPanel(riskyPanel);
  const types = result.findings.map((finding) => finding.type);

  assert.equal(result.summary.panelDecision, "block");
  assert.ok(types.includes("reviewer_conflict"));
  assert.ok(types.includes("independence_gap"));
  assert.ok(types.includes("unlocked_submission_manifest"));
  assert.ok(types.includes("score_variance"));
  assert.ok(types.includes("feedback_gap"));
  assert.ok(types.includes("decision_explanation_gap"));
  assert.ok(
    result.arbitrationPacket.requiredActions.some((action) =>
      action.toLowerCase().includes("replace conflicted reviewers")
    )
  );
});

test("approves independent panels with locked evidence, low variance, and explained consensus", () => {
  const result = evaluateReviewerPanel(healthyPanel);

  assert.equal(result.summary.panelDecision, "approve");
  assert.equal(result.summary.findingCount, 0);
  assert.equal(result.summary.consensusQuality, "high");
  assert.equal(result.summary.averageScore >= healthyPanel.rubric.decisionThreshold, true);
  assert.deepEqual(result.findings, []);
  assert.ok(result.arbitrationPacket.requiredActions.includes("Proceed with sponsor award or phase advancement."));
});

test("emits arbitration-ready findings with evidence, remediation, and panel digest", () => {
  const result = evaluateReviewerPanel(riskyPanel);

  for (const finding of result.findings) {
    assert.ok(finding.id);
    assert.ok(["critical", "high", "medium", "low"].includes(finding.severity));
    assert.ok(finding.evidence.length > 0);
    assert.ok(finding.remediation.length > 10);
  }

  assert.ok(result.arbitrationPacket.digest.startsWith("sha256:"));
  assert.equal(result.arbitrationPacket.submissionId, "sub-2026-014");
  assert.equal(result.arbitrationPacket.phase, "prototype review");
});
