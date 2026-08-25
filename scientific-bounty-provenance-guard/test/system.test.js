import test from "node:test";
import assert from "node:assert/strict";
import { CHALLENGE_TEMPLATES, ScientificBountySystem } from "../src/system.js";

function createSystem() {
  let tick = 0;
  return new ScientificBountySystem({
    clock: () => `2026-08-25T08:00:${String(tick++).padStart(2, "0")}Z`
  });
}

function challengeInput(overrides = {}) {
  return {
    id: "challenge-climate-1",
    title: "Regional flood forecasting",
    scientificContext: "Improve calibrated flood warnings for underserved river basins.",
    vertical: "climate",
    deliverables: [
      { id: "proposal", description: "Experimental plan and data statement" },
      { id: "model", description: "Reproducible forecasting model" }
    ],
    rubric: [
      { id: "accuracy", description: "Forecast accuracy", weight: 60, maxScore: 10 },
      { id: "reproducibility", description: "Independent rerun quality", weight: 40, maxScore: 10 }
    ],
    phases: [
      { id: "proposal", deadline: "2026-09-01T00:00:00Z", deliverableIds: ["proposal"] },
      { id: "final", deadline: "2026-10-01T00:00:00Z", deliverableIds: ["model"] }
    ],
    prize: { currency: "USDC", amount: 1000 },
    payoutSchedule: [
      { id: "proposal-award", phaseId: "proposal", kind: "milestone", amount: 300 },
      { id: "final-award", phaseId: "final", kind: "final", amount: 700 }
    ],
    visibility: "private",
    participationMode: "anonymous",
    prequalificationRequired: true,
    ndaRequired: true,
    ipPolicy: { mode: "sponsored", license: "Research-use license until settlement" },
    escrow: { currency: "USDC", fundedAmount: 1000, reference: "escrow:test:001" },
    ...overrides
  };
}

function openWorkspace(system) {
  return system.openWorkspace("challenge-climate-1", {
    id: "workspace-team-a",
    teamId: "team-a",
    teamName: "Named team",
    pseudonym: "Solver 017",
    memberIds: ["researcher-1", "researcher-2"],
    prequalificationApproved: true,
    ndaAcceptedAt: "2026-08-25T08:01:00Z"
  });
}

function submitProposal(system) {
  return system.submit("workspace-team-a", {
    id: "submission-proposal-1",
    phaseId: "proposal",
    title: "Flood forecast proposal",
    abstract: "A calibrated hydrology model with an independent regional holdout.",
    reproducibilityNote: "Run notebook.ipynb with seed 42.",
    deliverableIds: ["proposal"],
    artifacts: [
      {
        path: "proposal/model-card.md",
        sha256: "a".repeat(64),
        license: "CC-BY-4.0",
        dataset: "open-river-basin-v2"
      }
    ]
  });
}

function acceptProposal(system) {
  return system.review("submission-proposal-1", {
    id: "review-proposal-1",
    reviewerId: "reviewer-independent",
    reviewerTeamId: "reviewer-team",
    scores: [
      { criterionId: "accuracy", score: 9 },
      { criterionId: "reproducibility", score: 8 }
    ],
    checklist: [
      { item: "proposal artifact present", passed: true },
      { item: "dataset and license declared", passed: true }
    ],
    provenanceDecision: "release",
    feedback: "Meets the proposal milestone and is ready for sponsor arbitration."
  });
}

test("challenge posting validates the complete sponsor contract and escrow", () => {
  const system = createSystem();
  const challenge = system.postChallenge(challengeInput());

  assert.equal(challenge.status, "open");
  assert.equal(challenge.escrowAvailable, 1000);
  assert.deepEqual(challenge.template, CHALLENGE_TEMPLATES.climate);
  assert.equal(challenge.payoutSchedule.length, 2);
});

test("underfunded challenges remain drafts and invalid schedules fail closed", () => {
  const system = createSystem();
  const draft = system.postChallenge(
    challengeInput({
      id: "challenge-underfunded",
      escrow: { currency: "USDC", fundedAmount: 500, reference: "escrow:test:002" }
    })
  );
  assert.equal(draft.status, "draft");

  assert.throws(
    () =>
      createSystem().postChallenge(
        challengeInput({
          rubric: [
            { id: "accuracy", description: "Forecast accuracy", weight: 50, maxScore: 10 },
            { id: "reproducibility", description: "Rerun quality", weight: 40, maxScore: 10 }
          ]
        })
      ),
    /rubric weights must total 100/
  );
  assert.throws(
    () =>
      createSystem().postChallenge(
        challengeInput({
          payoutSchedule: [
            { id: "overspend", phaseId: "proposal", kind: "milestone", amount: 1001 }
          ]
        })
      ),
    /cannot exceed the prize amount/
  );
});

test("private anonymous workspaces enforce prequalification, NDA, and identity access", () => {
  const system = createSystem();
  system.postChallenge(challengeInput());

  assert.throws(
    () =>
      system.openWorkspace("challenge-climate-1", {
        id: "blocked",
        teamId: "team-a",
        pseudonym: "Solver 017",
        memberIds: ["researcher-1"]
      }),
    /prequalification approval is required/
  );

  const workspace = openWorkspace(system);
  assert.equal(workspace.displayName, "Solver 017");
  assert.equal(workspace.teamId, "team-a");
  assert.throws(
    () => system.viewWorkspace("workspace-team-a", { role: "visitor" }),
    /private workspace access denied/
  );

  const reviewerView = system.viewWorkspace("workspace-team-a", { role: "reviewer" });
  assert.equal(reviewerView.teamId, null);
  assert.deepEqual(reviewerView.memberIds, []);
});

test("submission packages enforce phase deliverables and preserve versioned audit evidence", () => {
  const system = createSystem();
  system.postChallenge(challengeInput());
  openWorkspace(system);

  assert.throws(
    () =>
      system.submit("workspace-team-a", {
        id: "incomplete",
        phaseId: "proposal",
        title: "Incomplete",
        abstract: "Missing the required proposal deliverable.",
        reproducibilityNote: "No run needed.",
        deliverableIds: ["model"],
        artifacts: [
          {
            path: "model.bin",
            sha256: "b".repeat(64),
            license: "MIT",
            dataset: "demo"
          }
        ]
      }),
    /missing phase deliverables: proposal/
  );

  assert.throws(
    () =>
      system.submit("workspace-team-a", {
        id: "invalid-hash",
        phaseId: "proposal",
        title: "Invalid artifact hash",
        abstract: "A complete proposal with a malformed artifact digest.",
        reproducibilityNote: "Run proposal.js.",
        deliverableIds: ["proposal"],
        artifacts: [
          {
            path: "proposal.md",
            sha256: "not-a-sha256",
            license: "CC-BY-4.0",
            dataset: "open-river-basin-v2"
          }
        ]
      }),
    /64-character hexadecimal SHA-256/
  );

  const submission = submitProposal(system);
  assert.equal(submission.version, 1);
  assert.equal(submission.displayName, "Solver 017");
  assert.equal(system.viewSubmission(submission.id, { role: "reviewer" }).teamId, null);
  assert.match(system.auditLog(submission.id)[0].type, /submission\.created/);
});

test("review, arbitration, routed milestone payout, and IP transfer work end to end", () => {
  const system = createSystem();
  system.postChallenge(challengeInput());
  openWorkspace(system);
  submitProposal(system);

  assert.throws(
    () =>
      system.review("submission-proposal-1", {
        id: "conflicted-review",
        reviewerId: "researcher-1",
        reviewerTeamId: "team-a",
        scores: [
          { criterionId: "accuracy", score: 10 },
          { criterionId: "reproducibility", score: 10 }
        ],
        checklist: [{ item: "complete", passed: true }],
        provenanceDecision: "release",
        feedback: "Self review"
      }),
    /cannot evaluate their own team/
  );

  const review = acceptProposal(system);
  assert.equal(review.decision, "accept");
  assert.equal(review.weightedScore, 86);

  assert.throws(
    () =>
      system.planAward("submission-proposal-1", {
        id: "bad-routes",
        reviewId: review.id,
        scheduleId: "proposal-award",
        routes: [{ recipientId: "team-a", recipientType: "team", amount: 299 }]
      }),
    /routes must total/
  );

  const award = system.planAward("submission-proposal-1", {
    id: "award-proposal-1",
    reviewId: review.id,
    scheduleId: "proposal-award",
    routes: [
      { recipientId: "researcher-1", recipientType: "individual", amount: 150 },
      { recipientId: "university-1", recipientType: "institution", amount: 150 }
    ]
  });
  assert.equal(award.status, "planned");
  assert.equal(award.ipState, "transfer-pending-payment");

  const settled = system.settleAward(award.id, { paymentReference: "base:0xabc123" });
  assert.equal(settled.status, "paid");
  assert.equal(settled.ipState, "transferred");
  assert.equal(settled.paymentReference, "base:0xabc123");
  assert.throws(
    () => system.settleAward(award.id, { paymentReference: "base:0xduplicate" }),
    /not awaiting settlement/
  );
});

test("failed provenance or reviewer checklist keeps a submission out of payout", () => {
  const system = createSystem();
  system.postChallenge(challengeInput());
  openWorkspace(system);
  submitProposal(system);

  const review = system.review("submission-proposal-1", {
    id: "review-held",
    reviewerId: "reviewer-independent",
    scores: [
      { criterionId: "accuracy", score: 10 },
      { criterionId: "reproducibility", score: 10 }
    ],
    checklist: [{ item: "artifact integrity", passed: false }],
    provenanceDecision: "hold",
    feedback: "Artifact provenance requires arbitration."
  });
  assert.equal(review.decision, "revise");
  assert.throws(
    () =>
      system.planAward("submission-proposal-1", {
        id: "blocked-award",
        reviewId: review.id,
        scheduleId: "proposal-award",
        routes: [{ recipientId: "team-a", recipientType: "team", amount: 300 }]
      }),
    /accepted review/
  );
});
