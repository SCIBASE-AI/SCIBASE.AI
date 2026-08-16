"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  analyzeIdentityMergePacket,
  analyzeIdentityMergePackets,
  projectedCreditSpike,
  verifiedProofTypes
} = require("../src/index.js");

const packets = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "sample-merge-packets.json"), "utf8")
);

test("approves a clean identity merge packet", () => {
  const result = analyzeIdentityMergePacket(packets[0]);

  assert.equal(result.packetId, "identity-approve-001");
  assert.equal(result.decision, "APPROVE_MERGE");
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.verifiedProofTypes, ["orcid", "github", "institutional_email"]);
});

test("holds conflicted profile merges before credit transfer", () => {
  const result = analyzeIdentityMergePacket(packets[1]);
  const codes = result.findings.map((finding) => finding.code);

  assert.equal(result.decision, "HOLD_MERGE");
  assert.ok(codes.includes("ORCID_CONFLICT"));
  assert.ok(codes.includes("GITHUB_HANDLE_CONFLICT"));
  assert.ok(codes.includes("PRIVATE_OR_BLIND_REVIEW_LEAK"));
  assert.ok(codes.includes("DUPLICATE_PUBLICATION_COLLISION"));
  assert.ok(codes.includes("AUDIT_RECEIPT_MISSING"));
});

test("routes stale evidence and excessive credit deltas to review", () => {
  const result = analyzeIdentityMergePacket(packets[2]);
  const codes = result.findings.map((finding) => finding.code);

  assert.equal(result.decision, "REVIEW_MERGE");
  assert.deepEqual(codes.sort(), [
    "CREDIT_SPIKE_AFTER_MERGE",
    "INSTITUTIONAL_EMAIL_UNVERIFIED"
  ]);
});

test("aggregates decisions and finding counts for reviewer queues", () => {
  const { summary } = analyzeIdentityMergePackets(packets);

  assert.equal(summary.totalPackets, 4);
  assert.deepEqual(summary.decisions, {
    APPROVE_MERGE: 1,
    REVIEW_MERGE: 1,
    HOLD_MERGE: 2
  });
  assert.equal(summary.findingCounts.DUPLICATE_PUBLICATION_COLLISION, 2);
  assert.equal(summary.findingCounts.SOURCE_PROFILE_OBJECTION_OPEN, 2);
});

test("exposes small helpers for API integration tests", () => {
  assert.deepEqual(verifiedProofTypes(packets[0]), ["orcid", "github", "institutional_email"]);
  assert.deepEqual(projectedCreditSpike(packets[2]), {
    delta: 58,
    allowance: 45,
    isSpike: true
  });
});
