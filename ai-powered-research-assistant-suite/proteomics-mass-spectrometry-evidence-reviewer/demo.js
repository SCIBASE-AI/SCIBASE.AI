"use strict";

const fs = require("fs");
const path = require("path");
const fixture = require("./fixtures/proteomics-study.json");
const { reviewProteomicsEvidence, toMarkdown, toSvg } = require("./index");

const report = reviewProteomicsEvidence(fixture);
const reportsDir = path.join(__dirname, "reports");

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "proteomics-evidence-review.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "proteomics-evidence-review.md"), `${toMarkdown(report)}\n`);
fs.writeFileSync(path.join(reportsDir, "proteomics-evidence-summary.svg"), `${toSvg(report)}\n`);

console.log(`wrote proteomics review artifacts to ${reportsDir}`);
