import assert from "node:assert/strict";
import { auditReputationSybilCluster, buildReviewerMarkdown, buildSummarySvg } from "./index.js";
import { cleanReputationPacket, riskyReputationPacket } from "./sample-data.js";

const risky = auditReputationSybilCluster(riskyReputationPacket);
assert.equal(risky.decision, "quarantine-cluster");
assert.ok(risky.riskScore >= 90);
assert.ok(risky.findings.some((finding) => finding.code === "SHARED_PAYOUT_HANDLE"));
assert.ok(risky.findings.some((finding) => finding.code === "RECYCLED_DEVICE_FINGERPRINT"));
assert.ok(risky.findings.some((finding) => finding.code === "SELF_REVIEW_RING_RISK"));
assert.ok(risky.findings.some((finding) => finding.code === "MISSING_CLUSTER_QUARANTINE"));

const clean = auditReputationSybilCluster(cleanReputationPacket);
assert.equal(clean.decision, "reputation-clear");
assert.equal(clean.riskScore, 0);
assert.equal(clean.summary.findingCount, 0);

assert.throws(() => auditReputationSybilCluster(null), /reputation packet must be an object/);
assert.match(buildReviewerMarkdown(risky), /quarantine-cluster/);
assert.match(buildSummarySvg(risky), /Reputation Sybil Cluster Guard/);

console.log("reputation sybil cluster guard tests passed");
