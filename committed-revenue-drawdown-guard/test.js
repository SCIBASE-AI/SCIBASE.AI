"use strict";

const assert = require("assert");
const sampleContracts = require("./sample-data");
const { evaluateContract, evaluatePortfolio } = require("./index");

function byStream(contract, stream) {
  return contract.streamSummaries.find((summary) => summary.stream === stream);
}

const northbridge = evaluateContract(sampleContracts[0], { asOf: "2026-05-20" });
assert.strictEqual(northbridge.contractId, "IC-2026-NORTHBRIDGE");
assert.strictEqual(byStream(northbridge, "compute").status, "overage-risk");
assert.strictEqual(byStream(northbridge, "analytics").status, "under-consumption-risk");
assert(northbridge.actions.some((action) => action.code === "compute-amendment-review"));
assert(northbridge.actions.some((action) => action.code === "analytics-drawdown-plan"));

const helix = evaluateContract(sampleContracts[2], { asOf: "2026-05-20" });
assert.strictEqual(byStream(helix, "analytics").status, "under-consumption-risk");
assert.strictEqual(helix.expiringCredits.length, 1);
assert.strictEqual(helix.lowMarginUsage.length, 1);
assert(helix.revenueCertaintyScore < 70);

const stableA = evaluateContract(sampleContracts[1], { asOf: "2026-05-20" }).auditDigest;
const stableB = evaluateContract(sampleContracts[1], { asOf: "2026-05-20" }).auditDigest;
assert.strictEqual(stableA, stableB);

const portfolio = evaluatePortfolio(sampleContracts, { asOf: "2026-05-20" });
assert.strictEqual(portfolio.portfolio.contractCount, 3);
assert(portfolio.portfolio.committed > portfolio.portfolio.consumed);
assert(portfolio.portfolio.atRisk > 0);
assert(portfolio.contracts[0].revenueCertaintyScore <= portfolio.contracts[1].revenueCertaintyScore);
assert.strictEqual(portfolio.auditDigest.length, 64);

console.log("committed-revenue-drawdown-guard tests passed");
