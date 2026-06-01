import { mkdir, writeFile } from "node:fs/promises";
import { riskyAnalysisPacket } from "./sample-data.js";
import { buildReviewerMarkdown, buildSummarySvg, reviewModelAssumptions } from "./index.js";

const reportsDir = new URL("./reports/", import.meta.url);
await mkdir(reportsDir, { recursive: true });

const report = reviewModelAssumptions(riskyAnalysisPacket);
await writeFile(new URL("model-assumption-report.json", reportsDir), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(new URL("model-assumption-report.md", reportsDir), buildReviewerMarkdown(report));
await writeFile(new URL("summary.svg", reportsDir), buildSummarySvg(report));
await writeFile(
  new URL("demo-script.txt", reportsDir),
  [
    "Demo: Model Assumption Diagnostics Assistant",
    `Manuscript: ${report.manuscriptId}`,
    `Decision: ${report.decision}`,
    `Risk score: ${report.riskScore}/100`,
    `Blockers: ${report.summary.blockCount}`,
    `Warnings: ${report.summary.warnCount}`,
    "Reviewer action: hold AI review until model family, separation, sensitivity, and diagnostic handoff blockers are fixed.",
  ].join("\n"),
);

console.log(JSON.stringify(report.summary, null, 2));
