const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildAppealsLedger, validateChallenge } = require("../src/appeals-ledger");

const samplePath = path.join(__dirname, "..", "data", "sample-appeals.json");
const challenge = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const ledger = buildAppealsLedger(challenge);

assert.equal(ledger.validation.status, "passed");
assert.equal(ledger.appeals.length, 2);
assert.equal(ledger.payout.status, "partial-hold");
assert.equal(ledger.payout.heldAmount, 60000);
assert.equal(ledger.payout.releasableAmount, 10000);

const conflictAppeal = ledger.appeals.find((appeal) => appeal.id === "appeal-aurora-conflict");
assert.equal(conflictAppeal.eligibility.status, "eligible");
assert.equal(conflictAppeal.evidenceLock.status, "locked");
assert.equal(conflictAppeal.reviewerConflicts.status, "conflict-review-needed");
assert.equal(conflictAppeal.payoutHold.status, "hold");
assert.equal(conflictAppeal.ipGuard.status, "blocked");
assert.equal(conflictAppeal.nextAction.owner, "sponsor");

const resolvedAppeal = ledger.appeals.find((appeal) => appeal.id === "appeal-boreal-split");
assert.equal(resolvedAppeal.sla.status, "resolved");
assert.equal(resolvedAppeal.payoutHold.status, "released");
assert.equal(resolvedAppeal.ipGuard.status, "ready-after-payout");

assert.equal(ledger.sponsorFeedbackPacket.openAppeals, 1);
assert.equal(ledger.sponsorFeedbackPacket.conflictReviews, 1);
assert.ok(ledger.dashboard.highPriorityItems[0].nextAction.includes("independent reviewer"));
assert.ok(ledger.auditTrail.some((event) => event.type === "payout-held"));
assert.equal(ledger.digest, buildAppealsLedger(challenge).digest);

const incomplete = validateChallenge({ challengeId: "draft" });
assert.equal(incomplete.status, "incomplete");
assert.ok(incomplete.missing.includes("appealPolicy.appealWindowHours"));

const degradedChallenge = JSON.parse(JSON.stringify(challenge));
degradedChallenge.evidenceSnapshots[0].artifactHashes = {};
const degradedLedger = buildAppealsLedger(degradedChallenge);
const degradedAppeal = degradedLedger.appeals.find((appeal) => appeal.id === "appeal-aurora-conflict");
assert.equal(degradedAppeal.evidenceLock.status, "partial-lock");
assert.equal(degradedAppeal.nextAction.owner, "arbitrator");

console.log("scientific-bounty-appeals-ledger tests passed");
