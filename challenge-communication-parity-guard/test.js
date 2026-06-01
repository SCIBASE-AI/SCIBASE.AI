const assert = require("assert");

const { assessCommunicationParity, normalizeChallenge } = require("./index");
const { completeChallenge, riskyChallenge } = require("./sample-data");

const clean = assessCommunicationParity(completeChallenge);
assert.strictEqual(clean.decision, "release");
assert.strictEqual(clean.summary.findings, 0);

const risky = assessCommunicationParity(riskyChallenge);
assert.strictEqual(risky.decision, "hold");
assert(risky.findings.some((finding) => finding.code === "MATERIAL_AUDIENCE_GAP"));
assert(risky.findings.some((finding) => finding.code === "PRIVATE_MATERIAL_HINT"));
assert(risky.findings.some((finding) => finding.code === "STALE_RULE_DIGEST"));
assert(risky.findings.some((finding) => finding.code === "ACCESSIBLE_ATTACHMENT_GAP"));
assert(risky.findings.some((finding) => finding.code === "UNFAIR_ACK_WINDOW"));
assert(risky.findings.some((finding) => finding.code === "MISSING_ACKNOWLEDGEMENT"));

const missingChannel = assessCommunicationParity({
  ...completeChallenge,
  teams: [
    ...completeChallenge.teams,
    {
      id: "team-delta",
      status: "eligible",
      timezone: "UTC",
      channels: ["sms"],
      accessibilityNeeds: [],
    },
  ],
  communications: [
    {
      ...completeChallenge.communications[0],
      audience: ["team-alpha", "team-beta", "team-gamma", "team-delta"],
      acknowledgements: {
        ...completeChallenge.communications[0].acknowledgements,
        "team-delta": "2026-06-02T17:30:00Z",
      },
    },
  ],
});
assert.strictEqual(missingChannel.decision, "revise");
assert(missingChannel.findings.some((finding) => finding.code === "CHANNEL_COVERAGE_GAP"));

assert.throws(
  () => normalizeChallenge({ ...completeChallenge, challengeId: "" }),
  /challengeId must be a non-empty string/
);

console.log("challenge communication parity guard tests passed");
