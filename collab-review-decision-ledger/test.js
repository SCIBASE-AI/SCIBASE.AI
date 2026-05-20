const assert = require("assert");

const {
  evaluateReviewDecision,
  buildReleaseSummary,
  createDecisionDigest,
} = require("./index");

const generatedAt = "2026-05-20T13:00:00.000Z";

const manuscript = {
  documentId: "doc-quantum-12",
  title: "Quantum catalyst manuscript",
  requiredApprovers: ["lead-author", "stat-reviewer", "data-owner"],
  sections: [
    {
      id: "intro",
      title: "Introduction",
      lock: { mode: "freeze-window", lockedAt: "2026-05-20T10:00:00.000Z" },
      comments: [],
      suggestions: [{ id: "sg-1", status: "accepted" }],
      notebookOutputs: [],
      approvals: [
        { role: "lead-author", status: "approved" },
        { role: "stat-reviewer", status: "approved" },
        { role: "data-owner", status: "approved" },
      ],
      decisionRecords: [{ id: "dec-1", status: "recorded", text: "Intro accepted." }],
      snapshot: { id: "snap-intro", restoreReady: true },
    },
    {
      id: "results",
      title: "Results",
      lock: { mode: "editable", lockedAt: "2026-05-17T08:00:00.000Z" },
      comments: [{ id: "c-7", severity: "blocking", resolved: false }],
      suggestions: [{ id: "sg-7", status: "open" }],
      notebookOutputs: [
        {
          id: "nb-7",
          status: "stale",
          lastExecutedAt: "2026-05-16T05:00:00.000Z",
          sourceHash: "sha256:old",
          currentSourceHash: "sha256:new",
        },
      ],
      approvals: [
        { role: "lead-author", status: "approved" },
        { role: "stat-reviewer", status: "pending" },
        { role: "data-owner", status: "approved" },
      ],
      decisionRecords: [{ id: "dec-7", status: "missing", text: "" }],
      snapshot: { id: "snap-results", restoreReady: false },
    },
  ],
};

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test("holds publish when collaborative review gates are unresolved", () => {
  const audit = evaluateReviewDecision({ manuscript, generatedAt });
  const results = audit.sectionDecisions.find((section) => section.sectionId === "results");

  assert(results, "expected results section decision");
  assert.strictEqual(results.decision, "hold_publish");
  assert(results.flags.includes("BLOCKING_COMMENT_OPEN"));
  assert(results.flags.includes("OPEN_SUGGESTION"));
  assert(results.flags.includes("NOTEBOOK_OUTPUT_STALE"));
  assert(results.flags.includes("APPROVAL_MISSING"));
  assert(results.flags.includes("SECTION_UNLOCKED"));
  assert(results.flags.includes("DECISION_RECORD_MISSING"));
  assert(results.flags.includes("RESTORE_SNAPSHOT_UNSAFE"));
  assert(results.releaseActions.some((action) => action.includes("Resolve 1 blocking comment")));
  assert(results.releaseActions.some((action) => action.includes("stat-reviewer")));
});

test("marks clean sections ready to freeze", () => {
  const audit = evaluateReviewDecision({ manuscript, generatedAt });
  const intro = audit.sectionDecisions.find((section) => section.sectionId === "intro");

  assert(intro, "expected intro section decision");
  assert.strictEqual(intro.decision, "ready_to_freeze");
  assert.deepStrictEqual(intro.flags, []);
  assert.strictEqual(intro.riskScore, 0);
  assert(intro.releaseActions.includes("Keep section frozen for publish review"));
});

test("builds document release summary", () => {
  const audit = evaluateReviewDecision({ manuscript, generatedAt });
  const summary = buildReleaseSummary(audit);

  assert.deepStrictEqual(summary.counts, {
    sections: 2,
    readyToFreeze: 1,
    holdPublish: 1,
    blockingComments: 1,
    staleNotebooks: 1,
    missingApprovals: 1,
  });
  assert.deepStrictEqual(summary.priorityActions, [
    "Hold publish: 1 section has unresolved release blockers.",
    "Resolve 1 blocking comment before freeze.",
    "Refresh 1 stale notebook output before release.",
    "Collect 1 missing role approval before publish.",
  ]);
});

test("creates stable decision digests from section facts", () => {
  const audit = evaluateReviewDecision({ manuscript, generatedAt });
  const section = audit.sectionDecisions.find((item) => item.sectionId === "results");

  const first = createDecisionDigest(section);
  const second = createDecisionDigest({ ...section, releaseActions: [...section.releaseActions] });

  assert.strictEqual(first, second);
  assert.match(first, /^crdl_[a-f0-9]{24}$/);
});
