const fs = require("node:fs");
const path = require("node:path");
const { createWebhookLedger, formatLedgerReport } = require("../src/webhook-ledger");

const manifestPath = path.join(__dirname, "..", "data", "sample-enterprise-events.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const ledger = createWebhookLedger(manifest);

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(ledger, null, 2)}\n`);
} else {
  process.stdout.write(`${formatLedgerReport(ledger)}\n`);
}

if (ledger.health === "invalid-manifest") {
  process.exitCode = 1;
}
