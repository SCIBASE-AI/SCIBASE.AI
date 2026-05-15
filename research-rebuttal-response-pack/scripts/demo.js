import samplePacket from "../data/sample-review-packet.json" with { type: "json" };
import { buildRebuttalResponsePack } from "../src/rebuttal-response-pack.js";

const pack = buildRebuttalResponsePack(samplePacket);

console.log(`Rebuttal response pack for: ${pack.title}`);
console.log(`Decision: ${pack.decision}`);
console.log(`Readiness: ${pack.resubmissionReadiness.status} (${pack.resubmissionReadiness.score}/100)`);
console.log("\nResponse matrix:");
for (const row of pack.responseMatrix) {
  console.log(`- ${row.id} [${row.severity}] ${row.concernTopic}`);
  console.log(`  claims: ${row.linkedClaimIds.join(", ") || "manual-link-required"}`);
  console.log(`  strategy: ${row.responseStrategy}`);
  console.log(`  tasks: ${row.revisionTasks.join(" | ")}`);
}

console.log("\nConcern clusters:");
for (const cluster of pack.concernClusters) {
  console.log(`- ${cluster.topic}: ${cluster.responseIds.join(", ")} (${cluster.highestSeverity})`);
}

console.log("\nEditor summary:");
console.log(JSON.stringify(pack.editorSummary, null, 2));
