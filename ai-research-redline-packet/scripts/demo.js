const fs = require("node:fs");
const path = require("node:path");
const { createRedlinePacket, formatPacketReport } = require("../src/redline-packet");

const manifestPath = path.join(__dirname, "..", "data", "sample-manuscript.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const packet = createRedlinePacket(manifest);

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
} else {
  process.stdout.write(`${formatPacketReport(packet)}\n`);
}

if (packet.decision === "invalid-manifest") {
  process.exitCode = 1;
}
