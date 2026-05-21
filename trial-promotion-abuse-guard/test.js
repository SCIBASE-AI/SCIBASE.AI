const assert = require("node:assert/strict");
const {evaluatePromotionControls, money} = require("./index");
const {sampleData} = require("./sample-data");

const result = evaluatePromotionControls(sampleData);
const byId = new Map(result.decisions.map((decision) => [decision.eventId, decision]));

assert.equal(result.metrics.totalEvents, 7);
assert.equal(result.metrics.approvedEvents, 2);
assert.equal(result.metrics.heldEvents, 4);
assert.equal(result.metrics.rejectedEvents, 1);

assert.equal(byId.get("evt-alpha-shadow-trial").status, "hold");
assert.deepEqual(
  byId.get("evt-alpha-shadow-trial").reasons.map((reason) => reason.code).sort(),
  ["domain_trial_reuse", "payment_trial_reuse"],
);

assert.equal(byId.get("evt-temp-trial").status, "rejected");
assert.equal(byId.get("evt-temp-trial").reasons[0].code, "disposable_domain");

assert.equal(byId.get("evt-alpha-stack").status, "hold");
assert(byId.get("evt-alpha-stack").discountLeakagePreventedCents > 0);
assert.equal(money(byId.get("evt-alpha-stack").discountLeakagePreventedCents), "$360.00");

assert.equal(byId.get("evt-consortium-expired").status, "hold");
assert.equal(byId.get("evt-consortium-expired").reasons[0].code, "consortium_roster_not_active");

assert.equal(byId.get("evt-convert-missing-payment").status, "hold");
assert(
  byId
    .get("evt-convert-missing-payment")
    .reasons.some((reason) => reason.code === "conversion_payment_missing"),
);

assert.equal(byId.get("evt-clean-lab-discount").status, "approved");
assert.match(result.digest, /^[a-f0-9]{64}$/);

console.log("trial promotion abuse guard tests passed");
