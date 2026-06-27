import { evaluateLicenseRelease } from "./licenseGuard.js";
import { writeArtifacts } from "./report.js";
import { samplePackets } from "./samplePackets.js";

const results = samplePackets.map((packet) => evaluateLicenseRelease(packet));

for (const result of results) {
  console.log(
    `${result.licenseId}: ${result.decision} (${result.financeAction})`,
  );
  for (const finding of result.findings) {
    console.log(`  - ${finding.severity} ${finding.code}: ${finding.message}`);
  }
}

writeArtifacts(results);
console.log("Artifacts written to artifacts/");
