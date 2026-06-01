"use strict";

const assert = require("assert");
const {
  evaluateSponsorAttestation,
  renderMarkdownReport,
  renderSvgSummary,
  stableStringify,
  daysBetween,
  normalizeJurisdiction
} = require("./index");
const sampleData = require("./sample-data");

const digest = "sha256:1111111111111111111111111111111111111111111111111111111111111111";

function testSampleReview() {
  const result = evaluateSponsorAttestation(sampleData);

  assert.strictEqual(result.releaseDecision, "block_challenge_publication");
  assert.strictEqual(result.summary.challengeCount, 4);
  assert.strictEqual(result.summary.readyCount, 1);
  assert.strictEqual(result.summary.holdCount, 1);
  assert.strictEqual(result.summary.blockCount, 2);
  assert.ok(result.summary.criticalCount >= 7, "expected blocking sponsor packet findings");
  assert.ok(result.summary.warningCount >= 5, "expected compliance hold warnings");
  assert.ok(result.auditDigest.match(/^[a-f0-9]{64}$/), "expected sha256 audit digest");

  const statuses = Object.fromEntries(result.challenges.map((challenge) => [challenge.challengeId, challenge.status]));
  assert.strictEqual(statuses["challenge-open-neuro-imaging"], "ready_to_open");
  assert.strictEqual(statuses["challenge-catalyst-literature"], "hold_for_compliance");
  assert.strictEqual(statuses["challenge-clinical-proteomics"], "block_challenge");
  assert.strictEqual(statuses["challenge-dual-use-sensors"], "block_challenge");

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.ok(codes.has("missing_source_of_funds_attestation"));
  assert.ok(codes.has("blocked_sanctions_screening"));
  assert.ok(codes.has("missing_high_value_tax_reporting_plan"));
  assert.ok(codes.has("restricted_export_without_counsel_approval"));
  assert.ok(codes.has("missing_public_rules_digest"));
  assert.ok(codes.has("missing_third_party_funding_disclosure"));
}

function testCleanChallenge() {
  const input = {
    generatedAt: "2026-06-01T00:00:00.000Z",
    challenges: [
      {
        id: "clean-challenge",
        title: "Clean Challenge",
        sponsor: {
          displayName: "Clean Lab",
          legalName: "Clean Lab Foundation",
          entityIdentifier: "US-NPO-100",
          jurisdiction: "US",
          authorizedSigner: {
            name: "A. Nguyen",
            role: "Program Officer",
            authorityDigest: digest
          }
        },
        prize: { amountUsd: 1000 },
        expectedPayoutJurisdictions: ["US"],
        funding: {
          sourceOfFundsAttested: true,
          statementDigest: digest,
          attestedAt: "2026-05-29T00:00:00.000Z"
        },
        sanctionsScreening: {
          status: "clear",
          reference: "SCR-CLEAN-1",
          checkedAt: "2026-05-29T00:00:00.000Z",
          beneficialOwners: [{ id: "owner-clean-1", role: "board", sanctionsHit: false }]
        },
        taxReporting: {
          formStatus: "complete",
          reportingPlanDigest: digest,
          withholdingReviewComplete: true
        },
        exportControl: {
          classification: "ear99",
          internationalParticipation: false
        },
        publicTerms: {
          rulesDigest: digest,
          cancellationPolicy: "published",
          refundPolicy: "published"
        },
        complianceContact: { email: "clean@example.test" }
      }
    ]
  };

  const result = evaluateSponsorAttestation(input);
  assert.strictEqual(result.releaseDecision, "ready_to_open");
  assert.strictEqual(result.summary.findingCount, 0);
  assert.strictEqual(result.challenges[0].status, "ready_to_open");
}

function testRenderersAndUtilities() {
  const result = evaluateSponsorAttestation(sampleData);
  const markdown = renderMarkdownReport(result);
  const svg = renderSvgSummary(result);

  assert.ok(markdown.includes("Sponsor Regulatory Attestation Packet Review"));
  assert.ok(markdown.includes(result.auditDigest));
  assert.ok(svg.includes("<svg"));
  assert.ok(svg.includes("Sponsor Regulatory Attestation Guard"));
  assert.strictEqual(stableStringify({ b: 1, a: 2 }), "{\"a\":2,\"b\":1}");
  assert.strictEqual(daysBetween("2026-06-01T00:00:00.000Z", "2026-06-04T00:00:00.000Z"), 3);
  assert.strictEqual(normalizeJurisdiction(" jp "), "JP");
}

testSampleReview();
testCleanChallenge();
testRenderersAndUtilities();

console.log("sponsor-regulatory-attestation-packet-guard tests passed");
