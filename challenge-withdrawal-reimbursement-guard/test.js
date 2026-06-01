const assert = require("node:assert/strict");
const { evaluateChallengeWithdrawal, sha256 } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const clean = evaluateChallengeWithdrawal(cleanPacket);
assert.equal(clean.summary.decision, "release_withdrawal_closeout");
assert.equal(clean.summary.findingCount, 0);
assert.equal(clean.summary.challengeCount, 1);
assert.equal(clean.summary.affectedSolvers, 2);
assert.equal(clean.summary.recommendedReimbursementUsd, 1076);
assert.equal(clean.summary.fundedShortfallUsd, 0);
assert.ok(clean.summary.auditDigest.startsWith("sha256:"));
assert.equal(clean.challenges[0].action, "release_withdrawal_closeout");

const risky = evaluateChallengeWithdrawal(riskyPacket);
assert.equal(risky.summary.decision, "escalate_withdrawal_dispute");
assert.equal(risky.summary.challengeCount, 1);
assert.equal(risky.summary.affectedSolvers, 3);
assert.equal(risky.summary.recommendedReimbursementUsd, 2586);
assert.equal(risky.summary.fundedShortfallUsd, 2286);
assert.ok(risky.summary.findingCount >= 17);
assert.ok(risky.summary.criticalFindings >= 3);
assert.ok(risky.summary.highOrCriticalFindings >= 12);

const findingCodes = new Set(risky.findings.map((finding) => finding.code));
assert.ok(findingCodes.has("CANCELLATION_AUTHORITY_MISSING"));
assert.ok(findingCodes.has("SOLVER_WITHDRAWAL_NOTICE_MISSING"));
assert.ok(findingCodes.has("NOTICE_PARITY_GAP"));
assert.ok(findingCodes.has("COST_CLAIM_PATH_NOT_IN_NOTICE"));
assert.ok(findingCodes.has("MILESTONE_EVIDENCE_HASH_MISSING"));
assert.ok(findingCodes.has("COST_CLAIM_EVIDENCE_MISSING"));
assert.ok(findingCodes.has("NONREFUNDABLE_RECEIPT_MISSING"));
assert.ok(findingCodes.has("REIMBURSEMENT_SHORTFALL"));
assert.ok(findingCodes.has("REIMBURSEMENT_DECISION_MISSING"));
assert.ok(findingCodes.has("DISPUTE_HOLD_WINDOW_TOO_SHORT"));
assert.ok(findingCodes.has("REIMBURSEMENT_RESERVE_SHORTFALL"));
assert.ok(findingCodes.has("IP_DATA_RETURN_ATTESTATION_MISSING"));

const firstDigest = evaluateChallengeWithdrawal(riskyPacket).summary.auditDigest;
const secondDigest = evaluateChallengeWithdrawal(riskyPacket).summary.auditDigest;
assert.equal(firstDigest, secondDigest);
assert.equal(sha256({ b: 2, a: 1 }), sha256({ a: 1, b: 2 }));

console.log("challenge withdrawal reimbursement guard tests passed");
