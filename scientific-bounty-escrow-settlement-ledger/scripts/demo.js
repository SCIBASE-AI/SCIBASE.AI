"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { evaluateEscrowBook } = require("../src/escrow-settlement-ledger");

const samplePath = path.join(__dirname, "..", "data", "sample-escrow-book.json");
const book = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const result = evaluateEscrowBook(book);

console.log(`Scientific bounty escrow settlement demo for ${result.marketplace.name}`);
console.log(`As of ${result.asOf}: ${result.summary.ready} ready, ${result.summary.held} held, ${result.summary.blocked} blocked`);
console.log(`Payable now: $${result.summary.payableNow}; held: $${result.summary.heldAmount}; shortfall: $${result.summary.shortfall}`);

for (const challenge of result.challenges) {
  console.log(
    `${challenge.challengeId}: ${challenge.settlementDecision} payable=$${challenge.payableTotal} shortfall=$${challenge.shortfall} ip=${challenge.ipReleaseState}`
  );
}

console.log(`Settlement packets: ${result.summary.settlementPacketCount}`);
console.log(`Signed event sample: ${result.ledgerEvents[0].challengeId} digest=${result.ledgerEvents[0].digest.slice(0, 16)} signature=${result.ledgerEvents[0].signature.slice(0, 16)}`);
