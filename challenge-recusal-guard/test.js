const assert = require("assert");
const { assignments } = require("./sample-data");
const { decisionFor, evaluateAssignments, severityRank } = require("./index");

assert.strictEqual(decisionFor("clear"), "allow-scoring");
assert.strictEqual(decisionFor("medium"), "require-disclosure");
assert.strictEqual(decisionFor("high"), "recuse-evaluator");
assert.strictEqual(decisionFor("critical"), "hold-payout-decision");
assert.strictEqual(severityRank([{ severity: "medium" }, { severity: "critical" }]), "critical");

const report = evaluateAssignments(assignments);
assert.strictEqual(report.totalAssignments, 4);
assert.strictEqual(report.payoutHolds, 2);
assert.strictEqual(report.recusals, 1);
assert.strictEqual(report.disclosures, 1);
assert.strictEqual(report.allowed, 0);

const quantum = report.reports.find((entry) => entry.challengeId === "quantum-noise-reduction");
assert(quantum.findings.some((finding) => finding.type === "competing-team-membership"));
assert(quantum.findings.some((finding) => finding.type === "anonymity-breach"));

const sponsor = report.reports.find((entry) => entry.challengeId === "materials-catalyst-model");
assert(sponsor.findings.some((finding) => finding.type === "material-financial-interest"));

console.log("challenge-recusal-guard tests passed");
