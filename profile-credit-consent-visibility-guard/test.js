const assert = require("node:assert/strict");
const {
  analyzeProfileCredits,
  createAuditDigest,
} = require("./index");
const { sampleProfileCreditPackets } = require("./sample-data");

const AS_OF = "2026-05-22T12:00:00.000Z";

function byId(result, id) {
  const credit = result.credits.find((entry) => entry.id === id);
  assert.ok(credit, `expected credit ${id} to exist`);
  return credit;
}

function run() {
  const result = analyzeProfileCredits(sampleProfileCreditPackets, {
    asOf: AS_OF,
  });

  assert.equal(result.asOf, AS_OF);
  assert.equal(result.totals.totalCredits, 7);
  assert.equal(result.totals.publishableReputationDelta, 17);
  assert.equal(result.totals.byStatus.publishable, 2);
  assert.equal(result.totals.byStatus.redacted, 1);
  assert.equal(result.totals.byStatus.citation_only, 1);
  assert.equal(result.totals.byStatus.institutional_only, 1);
  assert.equal(result.totals.byStatus.hold, 2);

  const dataset = byId(result, "credit-dataset-curation");
  assert.equal(dataset.status, "publishable");
  assert.equal(dataset.visibilityDecision, "public_profile_and_citation");
  assert.equal(dataset.publishableReputationDelta, 12);
  assert.ok(dataset.visibleFields.includes("orcid"));

  const openReview = byId(result, "credit-open-review");
  assert.equal(openReview.status, "publishable");
  assert.equal(openReview.publishableReputationDelta, 5);

  const blind = byId(result, "credit-double-blind-review");
  assert.equal(blind.status, "redacted");
  assert.equal(blind.publishableReputationDelta, 0);
  assert.ok(blind.visibleFields.includes("anonymous_reviewer_label"));
  assert.ok(blind.reasons.includes("double-blind review remains inside anonymous visibility window"));

  const embargoed = byId(result, "credit-embargoed-code");
  assert.equal(embargoed.status, "citation_only");
  assert.equal(embargoed.visibilityDecision, "embargoed_credit");
  assert.ok(embargoed.actions.some((action) => action.includes("2026-07-15")));

  const revoked = byId(result, "credit-revoked-consent");
  assert.equal(revoked.status, "hold");
  assert.equal(revoked.visibilityDecision, "do_not_publish");
  assert.ok(revoked.reasons.includes("profile credit consent has been revoked"));

  const privateProtocol = byId(result, "credit-private-protocol");
  assert.equal(privateProtocol.status, "institutional_only");
  assert.equal(privateProtocol.visibilityDecision, "restricted_export_only");
  assert.equal(privateProtocol.publishableReputationDelta, 0);

  const missing = byId(result, "credit-missing-evidence");
  assert.equal(missing.status, "hold");
  assert.equal(missing.visibilityDecision, "evidence_review");
  assert.ok(missing.reasons.includes("credit has no evidence receipt ids"));
  assert.ok(missing.reasons.includes("source receipt is not immutable"));

  const digest = createAuditDigest(result);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(digest, createAuditDigest(result));

  assert.throws(
    () =>
      analyzeProfileCredits(
        [{ researcherId: "bad", displayName: "Bad", profileConsent: {} }],
        { asOf: AS_OF }
      ),
    /must include credits/
  );

  assert.throws(
    () => analyzeProfileCredits([{ researcherId: "bad", credits: [{}] }], { asOf: AS_OF }),
    /missing required profile field/
  );
}

run();
console.log("profile credit consent visibility guard tests passed");
