import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildSponsorScorecard } from "../src/sponsor-scorecard.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const samplePath = join(__dirname, "..", "data", "sample-sponsor-input.json");
const sample = JSON.parse(await readFile(samplePath, "utf8"));

const report = buildSponsorScorecard(sample, {
  generatedAt: sample.asOf
});

console.log("Scientific Bounty Sponsor Scorecard");
console.log(`Portfolio: ${report.portfolioId}`);
console.log(`Average score: ${report.summary.averageScore}`);
console.log(`Tier distribution: ${JSON.stringify(report.summary.byTier)}`);
console.log(`Audit digest: ${report.auditDigest}`);

for (const card of report.scorecards) {
  console.log("");
  console.log(`${card.tier.toUpperCase()} ${card.score} - ${card.sponsorName}: ${card.challengeTitle}`);
  console.log(`Solver guidance: ${card.solverGuidance}`);
  console.log("Sponsor actions:");
  for (const item of card.sponsorActions.slice(0, 4)) {
    console.log(`- ${item}`);
  }
}
