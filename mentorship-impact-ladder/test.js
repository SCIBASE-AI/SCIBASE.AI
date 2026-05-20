const assert = require("node:assert/strict");
const data = require("./sample-data");
const { digest, renderMarkdown, renderSvg, runMentorshipAudit } = require("./index");

const report = runMentorshipAudit(data);
const byPair = new Map(report.pairReports.map((pair) => [pair.mentorshipId, pair]));

assert.equal(report.module, "mentorship-impact-ladder");
assert.equal(report.pairReports.length, 3);
assert.match(report.auditDigest, /^[a-f0-9]{64}$/);

assert.equal(byPair.get("pair-1").tier, "open-science-champion");
assert.ok(byPair.get("pair-1").score >= 88);
assert.equal(byPair.get("pair-1").findings.length, 0);
assert.ok(byPair.get("pair-1").creditedRoles.includes("validation"));

assert.equal(byPair.get("pair-2").tier, "emerging-mentor");
assert.ok(byPair.get("pair-2").findings.some((finding) => finding.code === "reproducibility-evidence-missing"));

assert.equal(byPair.get("pair-3").tier, "moderator-review");
assert.ok(byPair.get("pair-3").findings.some((finding) => finding.code === "trainee-acknowledgement-missing"));
assert.ok(byPair.get("pair-3").findings.some((finding) => finding.code === "relationship-conflict-review-required"));
assert.equal(byPair.get("pair-3").mentorDelta, 0);

assert.equal(report.summary.badgeEligibleCount, 2);
assert.equal(report.summary.moderatorReviewCount, 1);
assert.ok(report.institutionPacket.every((packet) => packet.packetDigest));

assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
assert.ok(renderMarkdown(report).includes("Mentorship Impact Ladder"));
assert.ok(renderSvg(report).startsWith("<svg"));

console.log("Mentorship impact ladder tests passed");
