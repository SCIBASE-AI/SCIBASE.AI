"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  REDACTED,
  createIdentityEscrowPacket,
  pseudonymFor,
  scoreIdentityAssurance,
  validateEscrowInput
} = require("../src/identity-escrow");

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/sample-escrow.json"), "utf8")
);

validateEscrowInput(fixture);

const packet = createIdentityEscrowPacket(fixture);

assert.equal(packet.programId, "blind-review-cohort-q3");
assert.equal(packet.summary.participants, 3);
assert.equal(packet.summary.escrowReady, 2);
assert.equal(packet.summary.allowedAccess, 1);
assert.equal(packet.summary.deniedAccess, 2);
assert.equal(packet.summary.deanonymizationApproved, 1);
assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);

const ada = fixture.participants.find((participant) => participant.id === "reviewer-ada");
const bo = fixture.participants.find((participant) => participant.id === "reviewer-bo");
assert.equal(scoreIdentityAssurance(ada), 100);
assert.equal(scoreIdentityAssurance(bo), 14);

const adaEscrow = packet.escrowRecords.find((record) => record.participantId === "reviewer-ada");
assert.equal(adaEscrow.publicHandle, pseudonymFor(fixture.programId, "reviewer-ada"));
assert.notEqual(adaEscrow.publicHandle, ada.displayName);
assert.equal(adaEscrow.identityVisibleToReviewSubject, false);
assert.equal(adaEscrow.identityEvidence.redactedSubjects[0].subject, REDACTED);

const rawDataDecision = packet.accessDecisions.find((decision) => decision.id === "grant-2");
assert.equal(rawDataDecision.decision, "deny");
assert.ok(rawDataDecision.reasons.includes("anonymous-reviewer-restricted-scope"));

const weakReviewerDecision = packet.accessDecisions.find((decision) => decision.id === "grant-3");
assert.equal(weakReviewerDecision.decision, "deny");
assert.ok(weakReviewerDecision.reasons.includes("identity-assurance-below-threshold"));
assert.ok(weakReviewerDecision.reasons.includes("data-use-training-expired"));

const approvedBreakglass = packet.deanonymizationDecisions.find((decision) => decision.id === "case-1");
assert.equal(approvedBreakglass.decision, "release-to-authorized-admins");
assert.match(approvedBreakglass.sealedIdentityHash, /^[a-f0-9]{64}$/);

const rejectedBreakglass = packet.deanonymizationDecisions.find((decision) => decision.id === "case-2");
assert.equal(rejectedBreakglass.decision, "keep-sealed");
assert.ok(rejectedBreakglass.reasons.includes("reason-not-policy-approved"));
assert.ok(rejectedBreakglass.reasons.includes("quorum-not-met"));

assert.ok(packet.actions.some((action) => action.type === "identity-hardening"));
assert.ok(packet.actions.some((action) => action.type === "privacy-breakglass"));

console.log("anonymous-review-identity-escrow tests passed");
