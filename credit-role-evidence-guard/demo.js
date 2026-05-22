import { mkdir, writeFile } from "node:fs/promises";
import { buildMarkdownReport, buildSummarySvg, evaluateCreditClaims } from "./index.js";
import { sampleArtifacts, sampleCreditClaims, sampleProjects } from "./sample-data.js";

const result = evaluateCreditClaims({
  projects: sampleProjects,
  artifacts: sampleArtifacts,
  claims: sampleCreditClaims,
});

await mkdir(new URL("./reports/", import.meta.url), { recursive: true });

await writeFile(
  new URL("./reports/reviewer-packet.json", import.meta.url),
  `${JSON.stringify(result, null, 2)}\n`,
);
await writeFile(
  new URL("./reports/reviewer-report.md", import.meta.url),
  buildMarkdownReport(result),
);
await writeFile(
  new URL("./reports/summary.svg", import.meta.url),
  buildSummarySvg(result),
);

console.log("Generated credit role evidence guard reports:");
console.log("- credit-role-evidence-guard/reports/reviewer-packet.json");
console.log("- credit-role-evidence-guard/reports/reviewer-report.md");
console.log("- credit-role-evidence-guard/reports/summary.svg");

