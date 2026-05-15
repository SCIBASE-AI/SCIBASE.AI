const { writeFileSync, mkdirSync } = require("fs");
const path = require("path");
const { buildGovernancePacket } = require("./src");
const { sampleProject } = require("./src/sample-data");

const packet = buildGovernancePacket(sampleProject);
const outDir = path.join(__dirname, "demo");
const outFile = path.join(outDir, "execution-drift-governance-packet.json");

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, `${JSON.stringify(packet, null, 2)}\n`);

console.log("Execution Environment Drift Governance Demo");
console.log(`Project: ${packet.projectId}`);
console.log(`Artifacts: ${packet.summary.artifacts}`);
console.log(`Ready artifacts: ${packet.summary.readyArtifacts}`);
console.log(`Blocked artifacts: ${packet.summary.blockedArtifacts}`);
console.log(`Runnable now: ${packet.summary.runnableNow}`);
console.log(`Review-required reruns: ${packet.summary.reviewReruns}`);
console.log(`Blocked reruns: ${packet.summary.blockedReruns}`);
console.log(`Packet: ${outFile}`);
