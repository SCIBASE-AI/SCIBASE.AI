import assert from "node:assert/strict";
import test from "node:test";
import { sampleChallenges, sampleParticipantApplications } from "../src/sample-data.js";
import {
  buildChallengeDashboard,
  buildPublishDecision,
  buildSponsorAuditPacket,
  clone,
  scoreParticipantApplication,
  validateChallenge,
} from "../src/intake-gate.js";
import { createServer } from "../src/server.js";

const biomarkerChallenge = sampleChallenges[0];
const climateChallenge = sampleChallenges[1];

test("validates a complete private biotech challenge as publish ready", () => {
  const validation = validateChallenge(biomarkerChallenge);

  assert.equal(validation.valid, true);
  assert.equal(validation.status, "publish-ready");
  assert.equal(validation.findings.length, 0);
  assert.match(validation.evidenceHash, /^sha256:/);
});

test("holds incomplete challenges with actionable blockers", () => {
  const validation = validateChallenge(climateChallenge);

  assert.equal(validation.valid, false);
  assert.equal(validation.status, "hold");
  assert.ok(validation.findings.some((finding) => finding.code === "sponsor-billing-not-ready"));
  assert.ok(validation.findings.some((finding) => finding.code === "missing-problem-scientificContext"));
  assert.ok(validation.findings.some((finding) => finding.code === "rubric-weight-total"));
  assert.ok(validation.findings.some((finding) => finding.code === "escrow-not-funded"));
});

test("builds publish decisions with checklist and blocker counts", () => {
  const decision = buildPublishDecision(climateChallenge);

  assert.equal(decision.decision, "hold");
  assert.equal(decision.blockerCount, 3);
  assert.equal(decision.publishChecklist.some((item) => item.label === "rubric sums to 100" && !item.passed), true);
});

test("scores qualified participant applications for prequalified challenges", () => {
  const score = scoreParticipantApplication(biomarkerChallenge, sampleParticipantApplications[0]);

  assert.equal(score.eligible, true);
  assert.equal(score.score, 100);
  assert.equal(score.requiredActions.length, 0);
});

test("rejects participant applications missing NDA, ORCID, institution, and conflict disclosure", () => {
  const score = scoreParticipantApplication(biomarkerChallenge, sampleParticipantApplications[1]);

  assert.equal(score.eligible, false);
  assert.ok(score.requiredActions.includes("connect-orcid"));
  assert.ok(score.requiredActions.includes("verify-institution"));
  assert.ok(score.requiredActions.includes("submit-conflict-disclosure"));
  assert.ok(score.requiredActions.includes("sign-nda"));
});

test("dashboard summarizes publish readiness and application scoring", () => {
  const dashboard = buildChallengeDashboard(sampleChallenges, sampleParticipantApplications);

  assert.equal(dashboard.totalChallenges, 2);
  assert.equal(dashboard.publishReady, 1);
  assert.equal(dashboard.holds.length, 1);
  assert.equal(dashboard.applicationScores.length, 2);
});

test("sponsor audit packet includes prequalification and IP/escrow assurances", () => {
  const packet = buildSponsorAuditPacket(biomarkerChallenge, sampleParticipantApplications);

  assert.equal(packet.packetVersion, "bounty-intake-compliance-gate/v0.1");
  assert.equal(packet.publishDecision.decision, "publish");
  assert.equal(packet.prequalification.applications.length, 2);
  assert.equal(packet.sponsorAssurances.escrowStatus, "funded");
  assert.equal(packet.sponsorAssurances.solverRetainsIpUntilPaid, true);
  assert.match(packet.evidenceHash, /^sha256:/);
});

test("invalid IP transfer policies are blocked", () => {
  const unsafe = clone(biomarkerChallenge);
  unsafe.ipPolicy.solverRetainsIpUntilPaid = false;

  const validation = validateChallenge(unsafe);
  assert.equal(validation.valid, false);
  assert.ok(validation.findings.some((finding) => finding.code === "ip-before-payout-risk"));
});

test("API factory uses injected challenge data", async () => {
  const customChallenge = clone(biomarkerChallenge);
  customChallenge.id = "challenge-custom";
  customChallenge.title = "Custom injected challenge";

  const server = createServer([customChallenge], []);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/publish-decision?id=challenge-custom`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.challengeId, "challenge-custom");
    assert.equal(body.title, "Custom injected challenge");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
