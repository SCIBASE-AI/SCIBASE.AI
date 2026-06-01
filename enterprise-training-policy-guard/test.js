const assert = require("node:assert/strict");
const { cleanPacket, riskyPacket } = require("./sample-data");
const {
  evaluateTrainingPolicyPacket,
  requiredTrainingFor,
  summarizeDecision
} = require("./index");

const clean = evaluateTrainingPolicyPacket(cleanPacket);
assert.equal(clean.decision, "release");
assert.equal(clean.blockerCount, 0);
assert.equal(clean.revisionCount, 0);
assert.equal(clean.checkedResearchers, 2);

const risky = evaluateTrainingPolicyPacket(riskyPacket);
assert.equal(risky.decision, "hold");
assert.equal(risky.blockerCount, 4);
assert.equal(risky.revisionCount, 2);
assert.ok(risky.findings.some((item) => item.code === "TRAINING_EXPIRED"));
assert.ok(risky.findings.some((item) => item.code === "POLICY_ACK_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "TRAINING_RECEIPT_MISSING"));
assert.ok(risky.findings.some((item) => item.researcherId === "u-201" && item.code === "TRAINING_MISSING"));

assert.deepEqual(
  requiredTrainingFor(
    { id: "u-300", role: "external_collaborator", training: {}, policies: {} },
    { requiredTraining: ["ai-governance"] }
  ),
  ["ai-governance", "human-subjects", "secure-export"]
);

assert.equal(summarizeDecision([{ severity: "revise" }]), "revise");
assert.equal(summarizeDecision([{ severity: "block" }, { severity: "revise" }]), "hold");
assert.throws(() => evaluateTrainingPolicyPacket({ generatedAt: "not-a-date", action: {}, researchers: [] }));

console.log("enterprise training policy guard tests passed");
