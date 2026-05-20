"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buildAuditAnomalyMonitor,
  buildReviewerMarkdown,
  renderAuditSvg
} = require("./index");
const sampleData = require("./sample-data");

const report = buildAuditAnomalyMonitor(sampleData);
const outDir = __dirname;

fs.writeFileSync(path.join(outDir, "audit-report.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "reviewer-packet.md"), buildReviewerMarkdown(report));
fs.writeFileSync(path.join(outDir, "demo.svg"), renderAuditSvg(report));

console.log(JSON.stringify(report, null, 2));
