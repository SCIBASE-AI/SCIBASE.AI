const fs = require("node:fs");
const path = require("node:path");
const { buildAppealsLedger } = require("../src/appeals-ledger");

const samplePath = path.join(__dirname, "..", "data", "sample-appeals.json");
const challenge = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const ledger = buildAppealsLedger(challenge);

console.log(`Challenge: ${ledger.title}`);
console.log(`Appeals tracked: ${ledger.appeals.length}`);
console.log(`Payout status: ${ledger.payout.status}`);
console.log(`Held amount: US$${ledger.payout.heldAmount.toLocaleString("en-US")}`);
console.log(`Open appeals: ${ledger.dashboard.openAppealCount}`);
console.log(`Top action: ${ledger.dashboard.highPriorityItems[0].nextAction}`);
console.log(`IP guards: ${ledger.ipTransferGuards.length}`);
console.log(`Digest: ${ledger.digest}`);
