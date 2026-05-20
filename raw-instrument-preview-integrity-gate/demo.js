"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buildPreviewIntegrityGate,
  renderPreviewSvg
} = require("./index");
const sampleData = require("./sample-data");

const report = buildPreviewIntegrityGate(sampleData);
const outDir = __dirname;

fs.writeFileSync(path.join(outDir, "preview-report.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "demo.svg"), renderPreviewSvg(report));

console.log(JSON.stringify(report, null, 2));
