const assert = require("assert");
const packets = require("./sample-data");
const {
  evaluateRefund,
  evaluateRefundBatch,
  refundableAmount,
  requiredEvidenceFor,
} = require("./index");

const report = evaluateRefundBatch(packets);

function decision(id) {
  return report.decisions.find((item) => item.refundId === id);
}

assert.strictEqual(report.summary.total, 4);
assert.strictEqual(report.summary.approve, 0);
assert.strictEqual(report.summary.approve_with_adjustments, 2);
assert.strictEqual(report.summary.hold, 2);
assert.strictEqual(report.summary.requestedRefund, 11100);
assert.strictEqual(report.summary.heldRefunds, 7600);

const clean = decision("refund:annual-pro-cancel-clean");
assert.strictEqual(clean.decision, "approve_with_adjustments");
assert.strictEqual(clean.refundableAmount, 938);
assert(
  clean.warnings.some((item) => item.includes("processor fee")),
  "clean annual refund should surface non-refundable processor fee"
);

const invoice = decision("refund:institutional-invoice-missing-po");
assert.strictEqual(invoice.decision, "hold");
assert(
  invoice.blockers.some((item) => item.includes("po-or-invoice-evidence")),
  "institutional refund should require PO or invoice evidence"
);
assert(
  invoice.blockers.some((item) => item.includes("approval status")),
  "institutional refund should require approved finance status"
);
assert(
  invoice.blockers.some((item) => item.includes("reserve short")),
  "institutional refund should be held if reserve coverage is short"
);

const compute = decision("refund:compute-credit-over-request");
assert.strictEqual(compute.decision, "approve_with_adjustments");
assert.strictEqual(compute.refundableAmount, 1815);
assert(
  compute.warnings.some((item) => item.includes("exceeds unused service value")),
  "compute over-request should be capped by unused service value"
);

const restricted = decision("refund:restricted-grant-compute");
assert.strictEqual(restricted.decision, "hold");
assert(
  restricted.blockers.some((item) => item.includes("grant-refund-approval")),
  "restricted grant funded compute refund needs grant approval evidence"
);

assert.strictEqual(refundableAmount(packets[0]), 938);
assert(requiredEvidenceFor(packets[1]).includes("po-or-invoice-evidence"));
assert.match(report.auditDigest, /^[a-f0-9]{64}$/);
assert.match(evaluateRefund(packets[0]).auditDigest, /^[a-f0-9]{64}$/);

console.log("revenue refund liability reserve guard tests passed");
