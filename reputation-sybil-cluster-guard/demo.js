import { mkdir, writeFile } from "node:fs/promises";
import { auditReputationSybilCluster, buildReviewerMarkdown, buildSummarySvg } from "./index.js";
import { riskyReputationPacket } from "./sample-data.js";

const reportsDir = new URL("./reports/", import.meta.url);
await mkdir(reportsDir, { recursive: true });

const report = auditReputationSybilCluster(riskyReputationPacket);
await writeFile(new URL("sybil-cluster-report.json", reportsDir), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(new URL("sybil-cluster-report.md", reportsDir), buildReviewerMarkdown(report));
await writeFile(new URL("summary.svg", reportsDir), buildSummarySvg(report));
await writeFile(
  new URL("demo-script.txt", reportsDir),
  [
    "Demo: Reputation Sybil Cluster Guard",
    `Cluster: ${report.clusterId}`,
    `Decision: ${report.decision}`,
    `Risk score: ${report.riskScore}/100`,
    `Blockers: ${report.summary.blockCount}`,
    "Action: quarantine cluster before reputation points affect rankings, bounties, or payout eligibility.",
  ].join("\n"),
);

console.log(JSON.stringify(report.summary, null, 2));
