"use strict";

const fs = require("fs");
const path = require("path");
const {
  buildDemoFrame,
  buildReviewReport,
  buildSummarySvg,
  evaluateNotificationBatch
} = require("./index");
const { sampleBatch } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const result = evaluateNotificationBatch(sampleBatch);

fs.writeFileSync(
  path.join(reportsDir, "notification-visibility-packet.json"),
  `${JSON.stringify(result, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportsDir, "notification-visibility-report.md"),
  buildReviewReport(result)
);
fs.writeFileSync(
  path.join(reportsDir, "summary.svg"),
  buildSummarySvg(result)
);
fs.writeFileSync(
  path.join(reportsDir, "demo.ppm"),
  buildDemoFrame(result)
);

console.log(`routes=${result.summary.totalRoutes}`);
console.log(`deliver=${result.summary.deliver}`);
console.log(`sanitize=${result.summary.sanitize}`);
console.log(`hold=${result.summary.hold}`);
console.log(`drop=${result.summary.drop}`);
console.log(`auditDigest=${result.auditDigest}`);
