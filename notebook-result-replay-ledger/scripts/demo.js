const fs = require("node:fs");
const path = require("node:path");
const { createReplayLedger, formatLedgerReport } = require("../src/replay-ledger");

const manifestPath = path.join(__dirname, "..", "data", "sample-repository.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const ledger = createReplayLedger(manifest);

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(ledger, null, 2)}\n`);
} else {
  process.stdout.write(`${formatLedgerReport(ledger)}\n`);
}

if (ledger.releaseDecision === "invalid-manifest") {
  process.exitCode = 1;
}
