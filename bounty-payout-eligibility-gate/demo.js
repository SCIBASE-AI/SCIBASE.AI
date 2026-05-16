const sample = require("./sample-data.json");
const { buildPayoutReadinessPacket, summarizeForSponsor } = require("./src/eligibilityGate");

const packet = buildPayoutReadinessPacket(sample);
const sponsorSummary = summarizeForSponsor(packet);

console.log("Bounty payout eligibility gate demo");
console.log("------------------------------------");
console.log(`Challenge: ${packet.challengeTitle}`);
console.log(`Team: ${packet.teamName}`);
console.log(`Bounty: $${packet.bountyAmountUsd}`);
console.log(`Status: ${packet.status}`);
console.log(`Settlement recommendation: ${sponsorSummary.settlementRecommendation}`);
console.log(`IP release: ${packet.ipRelease}`);
console.log(`Audit digest: ${packet.auditDigest}`);
console.log("");
console.log("Payout plan:");
for (const entry of packet.payoutPlan) {
  console.log(`- ${entry.displayName}: ${entry.percent}% / $${entry.amountUsd} / ${entry.routingStatus}`);
}
console.log("");
console.log("Remediation actions:");
for (const item of packet.remediationActions) {
  console.log(`- [${item.severity}] ${item.owner}: ${item.message}`);
}
