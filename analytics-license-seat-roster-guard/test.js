const assert = require("assert");
const { project } = require("./sample-data");
const { buildReviewPacket, evaluateRoster, renderMarkdownReport, renderSvgSummary } = require("./index");

const evaluation = evaluateRoster(project);
const packet = buildReviewPacket(project);

assert.strictEqual(packet.guard, "analytics-license-seat-roster-guard");
assert.strictEqual(packet.issue, "SCIBASE-AI/SCIBASE.AI#20");
assert.strictEqual(packet.decision, "block-renewal-until-seat-evidence-is-clean");
assert.ok(packet.estimatedRevenueExposure >= 6000, "expected material revenue exposure");

assert.ok(
  evaluation.findings.some((finding) => finding.rule === "unapproved-seat-overage"),
  "expected dashboard seat overage finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "unapproved-seat-domain"),
  "expected unapproved external domain finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "api-usage-without-api-seat"),
  "expected API usage without API seat finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "duplicate-named-seat"),
  "expected duplicate named seat finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "inactive-paid-seat"),
  "expected inactive paid seat finding"
);

const cleanProject = JSON.parse(JSON.stringify(project));
cleanProject.contract.seatEntitlements.dashboard = 5;
cleanProject.contract.seatEntitlements.viewer = 6;
cleanProject.contract.allowedDomains.push("partner-lab.com");
cleanProject.roster.users = cleanProject.roster.users.filter((user) => user.id !== "seat-010");
cleanProject.roster.users.find((user) => user.id === "seat-003").lastSeenAt = "2026-05-01";
cleanProject.roster.users.find((user) => user.id === "seat-005").temporaryUntil = "2026-06-30";
cleanProject.roster.users.find((user) => user.id === "seat-007").seatClass = "api";
cleanProject.contract.seatEntitlements.api = 3;
const cleanPacket = buildReviewPacket(cleanProject);
assert.strictEqual(cleanPacket.decision, "renewal-roster-ready");
assert.strictEqual(cleanPacket.findings.length, 0);

const markdown = renderMarkdownReport(packet);
assert.ok(markdown.includes("## Seat Counts"));
assert.ok(markdown.includes("unapproved-seat-domain"));

const svg = renderSvgSummary(packet);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Analytics License Seat Roster Guard"));

console.log("analytics-license-seat-roster-guard tests passed");
