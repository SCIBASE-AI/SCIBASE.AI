const assert = require("assert");
const {
  collectEquations,
  evaluateEquationAnchorBatch,
  evaluateEquationAnchors,
} = require("./index");
const { sessions } = require("./sample-data");

const ready = sessions.find((item) => item.id === "manuscript-ready");
assert.strictEqual(collectEquations(ready).length, 2);

const readyDecision = evaluateEquationAnchors(ready);
assert.strictEqual(readyDecision.decision, "allow_export");
assert.strictEqual(readyDecision.blockers.length, 0);
assert.ok(readyDecision.evidence.some((item) => item.includes("eq:posterior")));

const duplicateDecision = evaluateEquationAnchors(
  sessions.find((item) => item.id === "duplicate-labels")
);
assert.strictEqual(duplicateDecision.decision, "hold_export");
assert.ok(
  duplicateDecision.blockers.some((item) => item.includes("duplicate equation label"))
);
assert.ok(
  duplicateDecision.blockers.some((item) => item.includes("references missing"))
);

const lockedDecision = evaluateEquationAnchors(
  sessions.find((item) => item.id === "locked-private-leak")
);
assert.strictEqual(lockedDecision.decision, "hold_export");
assert.ok(
  lockedDecision.blockers.some((item) => item.includes("private reviewer comment"))
);
assert.ok(
  lockedDecision.blockers.some((item) => item.includes("locked section"))
);

const report = evaluateEquationAnchorBatch(sessions);
assert.deepStrictEqual(
  {
    total: report.summary.total,
    allow_export: report.summary.allow_export,
    allow_with_notice: report.summary.allow_with_notice,
    hold_export: report.summary.hold_export,
  },
  {
    total: 3,
    allow_export: 1,
    allow_with_notice: 0,
    hold_export: 2,
  }
);
assert.strictEqual(report.decisions[0].auditDigest.length, 64);

console.log("collaborative equation anchor guard tests passed");
