"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buildDashboardAttributionMonitor,
  buildReviewerMarkdown,
  renderDashboardSvg
} = require("./index");
const sampleData = require("./sample-data");

const report = buildDashboardAttributionMonitor(sampleData);
const outDir = __dirname;

fs.writeFileSync(path.join(outDir, "dashboard-attribution-report.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "reviewer-packet.md"), buildReviewerMarkdown(report));
fs.writeFileSync(path.join(outDir, "demo.svg"), renderDashboardSvg(report));

console.log(JSON.stringify(report, null, 2));
