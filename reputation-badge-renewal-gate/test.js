const assert = require("node:assert/strict");
const { evaluateBadgeRenewals, collectEvidence } = require("./index");
const { badgePolicy, researchers } = require("./sample-data");

const result = evaluateBadgeRenewals(badgePolicy, researchers);

assert.equal(result.summary.total, 5);
assert.equal(result.summary.renew, 2);
assert.equal(result.summary.review, 2);
assert.equal(result.summary.expire, 1);
assert.equal(result.summary.downgrade, 0);

const trustedReviewer = result.packets.find(
  (packet) => packet.displayName === "Dr. Amina Rios" && packet.badge === "Trusted Reviewer",
);
assert.equal(trustedReviewer.decision, "renew");
assert.equal(trustedReviewer.evidence.reviewCount, 4);
assert.equal(trustedReviewer.evidence.anonymousReviewCount, 2);
assert.deepEqual(trustedReviewer.findings, []);

const reproducibilitySteward = result.packets.find(
  (packet) => packet.displayName === "Dr. Amina Rios" && packet.badge === "Reproducibility Steward",
);
assert.equal(reproducibilitySteward.decision, "renew");
assert.equal(reproducibilitySteward.evidence.reproducibilityCount, 3);

const appealHold = result.packets.find(
  (packet) => packet.displayName === "Prof. Luc Chen" && packet.badge === "Trusted Reviewer",
);
assert.equal(appealHold.decision, "review");
assert.ok(appealHold.findings.some((finding) => finding.code === "open-appeal-hold"));
assert.ok(appealHold.requiredActions.some((action) => action.includes("Resolve open appeal")));

const openScienceChampionReview = result.packets.find(
  (packet) => packet.displayName === "Prof. Luc Chen" && packet.badge === "Open Science Champion",
);
assert.equal(openScienceChampionReview.decision, "review");
assert.ok(
  openScienceChampionReview.findings.some(
    (finding) => finding.code === "stale-reproducibility-evidence",
  ),
);

const expired = result.packets.find(
  (packet) => packet.displayName === "Dr. Noor Patel" && packet.badge === "Open Science Champion",
);
assert.equal(expired.decision, "expire");
assert.ok(expired.requiredActions.some((action) => action.includes("Hide badge")));

const evidence = collectEvidence(researchers[0], 120);
assert.equal(evidence.recentReviews.length, 4);
assert.equal(evidence.recentCredits.length, 3);
assert.equal(evidence.oldestRecentEvidenceDays, 118);

console.log("reputation badge renewal gate tests passed");
