import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sample from "../data/sample-sponsor-input.json" with { type: "json" };
import {
  buildSponsorScorecard,
  evaluateChallenge,
  redactSensitiveFields,
  stableStringify
} from "../src/sponsor-scorecard.js";

describe("scientific bounty sponsor scorecard", () => {
  it("marks verified, responsive sponsors as trusted", () => {
    const trustedSponsor = sample.sponsors[0];
    const card = evaluateChallenge(trustedSponsor, trustedSponsor.challengePosts[0]);

    assert.equal(card.tier, "trusted");
    assert.ok(card.score >= 85);
    assert.equal(card.findings.some((finding) => finding.severity === "blocker"), false);
    assert.match(card.solverGuidance, /Ready for solver participation/);
  });

  it("holds challenges with missing funding and unsafe IP terms", () => {
    const riskySponsor = sample.sponsors[2];
    const card = evaluateChallenge(riskySponsor, riskySponsor.challengePosts[0]);

    assert.equal(card.tier, "hold");
    assert.ok(card.score < 55);
    assert.ok(card.sponsorActions.some((item) => item.includes("verified funding proof")));
    assert.ok(card.sponsorActions.some((item) => item.includes("retain IP until payment")));
  });

  it("routes incomplete but fixable challenges into watch", () => {
    const watchSponsor = sample.sponsors[1];
    const card = evaluateChallenge(watchSponsor, watchSponsor.challengePosts[0]);

    assert.equal(card.tier, "watch");
    assert.ok(card.score >= 55 && card.score < 80);
    assert.ok(card.sponsorActions.some((item) => item.includes("tie-break protocol")));
  });

  it("builds a deterministic public-safe digest", () => {
    const first = buildSponsorScorecard(sample, { generatedAt: sample.asOf });
    const second = buildSponsorScorecard(sample, { generatedAt: "2030-01-01T00:00:00.000Z" });

    assert.equal(first.auditDigest, second.auditDigest);
    assert.equal(first.summary.totalChallenges, 3);
    assert.deepEqual(first.summary.byTier, { trusted: 1, watch: 1, hold: 1 });
  });

  it("redacts private notes and payment identity fields from public echoes", () => {
    const redacted = redactSensitiveFields(sample);
    const serialized = stableStringify(redacted);

    assert.equal(serialized.includes("do-not-export"), false);
    assert.equal(serialized.includes("private@example.invalid"), false);
    assert.equal(serialized.includes("Finance lead phone"), false);
    assert.equal(serialized.includes("[redacted]"), true);
  });
});
