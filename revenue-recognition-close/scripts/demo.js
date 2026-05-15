const fs = require("node:fs");
const path = require("node:path");
const { buildRevenueClose } = require("../src/revenue-close");

const samplePath = path.join(__dirname, "..", "data", "sample-close.json");
const closeInput = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const close = buildRevenueClose(closeInput);

console.log(`Close: ${close.closeId}`);
console.log(`Status: ${close.dashboard.status}`);
console.log(`Recognized: US$${close.totals.recognizedThisPeriod.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
console.log(`Deferred after close: US$${close.totals.deferredAfterClose.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
console.log(`Receivable: US$${close.totals.receivableAtClose.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
console.log(`Dunning queue: ${close.dunningQueue.length}`);
console.log(`Close holds: ${close.creditAndRefundHolds.length}`);
console.log(`Top action: ${close.dashboard.highPriority[0].nextAction}`);
console.log(`Digest: ${close.digest}`);
