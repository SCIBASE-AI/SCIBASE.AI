import fs from "node:fs";
import path from "node:path";
import {
  evaluateFabricationAnomalyPacket,
  renderSummarySvg,
  summarizeReview,
} from "./src/assistant.js";
import { cleanPacket, riskyPacket } from "./src/samplePackets.js";

const reportsDir = path.join(process.cwd(), "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const clean = evaluateFabricationAnomalyPacket(cleanPacket);
const risky = evaluateFabricationAnomalyPacket(riskyPacket);

fs.writeFileSync(
  path.join(reportsDir, "clean-review.json"),
  `${JSON.stringify(clean, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(reportsDir, "risky-review.json"),
  `${JSON.stringify(risky, null, 2)}\n`,
);
fs.writeFileSync(path.join(reportsDir, "risky-review.md"), summarizeReview(risky));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSummarySvg(risky));

console.log("Wrote data fabrication anomaly assistant reports:");
console.log("- reports/clean-review.json");
console.log("- reports/risky-review.json");
console.log("- reports/risky-review.md");
console.log("- reports/summary.svg");
