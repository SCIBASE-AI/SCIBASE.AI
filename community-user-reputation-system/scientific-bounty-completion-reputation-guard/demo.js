"use strict";

const fs = require("fs");
const path = require("path");
const packet = require("./fixtures/completion-packet.json");
const { reviewCompletionReputation, toMarkdown, toSvg } = require("./index");

const report = reviewCompletionReputation(packet);
const reportsDir = path.join(__dirname, "reports");

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "bounty-reputation-review.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "bounty-reputation-review.md"), `${toMarkdown(report)}\n`);
fs.writeFileSync(path.join(reportsDir, "bounty-reputation-summary.svg"), `${toSvg(report)}\n`);

console.log(`wrote scientific bounty reputation artifacts to ${reportsDir}`);
