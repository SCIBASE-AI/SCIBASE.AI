import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sample from "../data/sample-change-plan.json" with { type: "json" };
import {
  buildApiChangeGovernance,
  evaluateChange,
  redactSensitiveFields,
  stableStringify
} from "../src/api-change-governance.js";

describe("enterprise API change governance", () => {
  it("approves additive versioned API changes with fresh sandbox evidence", () => {
    const additive = sample.changes[0];
    const review = evaluateChange(additive, sample.integrations, sample.policy, new Date(sample.asOf));

    assert.equal(review.state, "ready");
    assert.equal(review.breaking, false);
    assert.ok(review.riskScore < 20);
    assert.equal(review.findings.length, 0);
    assert.ok(review.adminActions.some((action) => action.includes("Approve")));
  });

  it("blocks breaking webhook removals without versioning, idempotency, or adequate notice", () => {
    const breaking = sample.changes[1];
    const review = evaluateChange(breaking, sample.integrations, sample.policy, new Date(sample.asOf));
    const codes = review.findings.map((finding) => finding.code);

    assert.equal(review.state, "blocked");
    assert.ok(codes.includes("breaking-diff"));
    assert.ok(codes.includes("removed-fields"));
    assert.ok(codes.includes("short-deprecation-window"));
    assert.ok(codes.includes("schema-version"));
    assert.ok(codes.includes("idempotency-key"));
  });

  it("detects restricted-data DPA and sandbox gaps before funder webhook rollout", () => {
    const restricted = sample.changes[2];
    const review = evaluateChange(restricted, sample.integrations, sample.policy, new Date(sample.asOf));
    const funder = review.affectedConsumers.find((consumer) => consumer.integrationId === "funder-reporter-nightly");

    assert.equal(review.state, "hold");
    assert.equal(funder.readiness, "blocked");
    assert.ok(funder.blockers.includes("restricted-data integration missing DPA"));
    assert.ok(review.adminActions.some((action) => action.includes("Open migration review")));
  });

  it("builds deterministic dashboard, manifest, webhook events, and digest", () => {
    const first = buildApiChangeGovernance(sample, { generatedAt: sample.asOf });
    const second = buildApiChangeGovernance(sample, { generatedAt: "2035-01-01T00:00:00.000Z" });

    assert.equal(first.auditDigest, second.auditDigest);
    assert.equal(first.dashboard.totalChanges, 3);
    assert.deepEqual(first.dashboard.byState, { ready: 1, watch: 0, hold: 1, blocked: 1 });
    assert.equal(first.exportManifest.readyChangeIds.includes("api-project-export-v3"), true);
    assert.equal(first.webhookEvents.length, 3);
    assert.match(first.webhookEvents[0].signature, /^[a-f0-9]{64}$/);
  });

  it("redacts private credentials before echoing input into review artifacts", () => {
    const redacted = redactSensitiveFields({
      apiKey: "secret-api-key",
      nested: { signingKey: "secret-hmac-key", safe: "visible" }
    });
    const serialized = stableStringify(redacted);

    assert.equal(serialized.includes("secret-api-key"), false);
    assert.equal(serialized.includes("secret-hmac-key"), false);
    assert.equal(serialized.includes("[redacted]"), true);
    assert.equal(serialized.includes("visible"), true);
  });
});
