const fs = require("node:fs");
const path = require("node:path");
const data = require("./sample-data");
const { renderMarkdown, renderSvg, runMentorshipAudit } = require("./index");

const report = runMentorshipAudit(data);
const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "mentorship-audit.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportsDir, "institution-packet.md"), renderMarkdown(report));
fs.writeFileSync(path.join(reportsDir, "mentorship-ladder.svg"), renderSvg(report));

console.log(JSON.stringify({
  averageScore: report.summary.averageScore,
  badgeEligibleCount: report.summary.badgeEligibleCount,
  moderatorReviewCount: report.summary.moderatorReviewCount,
  totalFindings: report.summary.totalFindings,
  auditDigest: report.auditDigest,
  reports: [
    "reports/mentorship-audit.json",
    "reports/institution-packet.md",
    "reports/mentorship-ladder.svg",
    "reports/demo.mp4"
  ]
}, null, 2));
