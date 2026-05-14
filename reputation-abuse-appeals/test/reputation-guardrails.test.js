import assert from "node:assert/strict";
import test from "node:test";
import { communitySnapshot } from "../src/sample-data.js";
import {
  buildAbuseReport,
  buildAppealPacket,
  buildModeratorQueue,
  buildTransparencyReport,
  clone,
  computeReputationAdjustments,
  computeReviewQuality,
  detectAnonymousSafetyIssues,
  detectEndorsementRings,
  detectReviewRateAnomalies,
  evaluateBadgeQuarantine,
} from "../src/reputation-guardrails.js";
import { createServer } from "../src/server.js";

test("scores detailed evidence-backed reviews higher than low-detail reviews", () => {
  const detailed = communitySnapshot.reviews.find((review) => review.id === "review-001");
  const weak = communitySnapshot.reviews.find((review) => review.id === "review-002");

  assert.ok(computeReviewQuality(detailed) > 70);
  assert.ok(computeReviewQuality(weak) < 35);
});

test("detects rapid review-rate anomalies", () => {
  const findings = detectReviewRateAnomalies(communitySnapshot);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].userId, "user-lin");
  assert.equal(findings[0].reviewIds.length, 3);
});

test("detects reciprocal endorsement rings", () => {
  const findings = detectEndorsementRings(communitySnapshot);

  assert.ok(findings.some((finding) => finding.users.includes("user-lin") && finding.users.includes("user-okafor")));
  assert.ok(findings.some((finding) => finding.users.includes("user-lin") && finding.users.includes("user-patel")));
});

test("detects anonymous review safety issues", () => {
  const findings = detectAnonymousSafetyIssues(communitySnapshot);

  assert.ok(findings.some((finding) => finding.reviewId === "review-002" && finding.requiredAction === "request-evidence-anchors"));
});

test("builds an abuse report with stable evidence hashes", () => {
  const report = buildAbuseReport(communitySnapshot);

  assert.ok(report.findingCount >= 5);
  assert.ok(report.highSeverityCount >= 2);
  assert.match(report.reportHash, /^sha256:/);
  assert.ok(report.findings.every((finding) => finding.evidenceHash?.startsWith("sha256:")));
});

test("computes reputation adjustments with penalties and quality bonuses", () => {
  const adjustments = computeReputationAdjustments(communitySnapshot);
  const lin = adjustments.find((adjustment) => adjustment.userId === "user-lin");
  const okafor = adjustments.find((adjustment) => adjustment.userId === "user-okafor");

  assert.ok(lin.adjustedReputation < lin.baseReputation);
  assert.ok(okafor.adjustedReputation <= okafor.baseReputation + okafor.bonus);
  assert.ok(lin.reasons.some((reason) => reason.includes("review-rate-anomaly")));
});

test("quarantines badges that no longer meet guardrail thresholds", () => {
  const badges = evaluateBadgeQuarantine(communitySnapshot);
  const lin = badges.find((decision) => decision.userId === "user-lin");
  const chen = badges.find((decision) => decision.userId === "user-chen");

  assert.ok(lin.frozenBadges.some((badge) => badge.badge === "rising-contributor"));
  assert.ok(!chen.frozenBadges.some((badge) => badge.badge === "trusted-reviewer"));
});

test("appeal packet links findings, adjustment, checklist, and recommendation", () => {
  const packet = buildAppealPacket(communitySnapshot, "appeal-001");

  assert.equal(packet.appeal.userId, "user-lin");
  assert.ok(packet.relevantFindings.length > 0);
  assert.equal(packet.recommendedResolution, "convert-penalty-to-review-revision-task");
  assert.ok(packet.moderatorChecklist.every((item) => item.passed));
  assert.match(packet.packetHash, /^sha256:/);
});

test("moderator queue prioritizes high severity findings and appeals", () => {
  const queue = buildModeratorQueue(communitySnapshot);

  assert.ok(queue.totalItems > 0);
  assert.ok(queue.highPriorityItems > 0);
  assert.ok(queue.queueItems.some((item) => item.type === "appeal"));
  assert.match(queue.queueHash, /^sha256:/);
});

test("transparency report summarizes public guardrail outcomes", () => {
  const report = buildTransparencyReport(communitySnapshot);

  assert.equal(report.publicSummary.reviewedUsers, communitySnapshot.users.length);
  assert.ok(report.publicSummary.findingCount > 0);
  assert.ok(report.publicSummary.frozenBadgeCount > 0);
  assert.match(report.transparencyHash, /^sha256:/);
});

test("clean snapshots do not create false positive review-rate anomalies", () => {
  const snapshot = clone(communitySnapshot);
  snapshot.reviews = snapshot.reviews.filter((review) => review.reviewerId !== "user-lin");

  assert.equal(detectReviewRateAnomalies(snapshot).length, 0);
});

test("API factory uses injected snapshot data", async () => {
  const snapshot = clone(communitySnapshot);
  snapshot.id = "custom-reputation-cycle";

  const server = createServer(snapshot);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/transparency`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.snapshotId, "custom-reputation-cycle");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
