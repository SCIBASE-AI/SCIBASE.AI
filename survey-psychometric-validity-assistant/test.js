import assert from "node:assert/strict";
import { evaluateSurveyPacket, renderMarkdownReport } from "./src/guard.js";
import { cleanPacket, riskyPacket } from "./src/samplePackets.js";

const clean = evaluateSurveyPacket(cleanPacket);
assert.equal(clean.decision, "RELEASE");
assert.equal(clean.findingCount, 0);
assert.equal(clean.releaseGate.canReleaseAiReview, true);

const risky = evaluateSurveyPacket(riskyPacket);
assert.equal(risky.decision, "HOLD");
assert.equal(risky.releaseGate.requiresPsychometricReviewer, true);
assert.ok(risky.findings.some((finding) => finding.code === "reverse_coding_drift"));
assert.ok(risky.findings.some((finding) => finding.code === "low_internal_consistency"));
assert.ok(risky.findings.some((finding) => finding.code === "missing_internal_consistency"));
assert.ok(risky.findings.some((finding) => finding.code === "factor_cross_loading"));
assert.ok(risky.findings.some((finding) => finding.code === "cfa_sample_size_shortfall"));
assert.ok(risky.findings.some((finding) => finding.code === "construct_claim_mismatch"));

const report = renderMarkdownReport(risky);
assert.match(report, /Survey Psychometric Validity Report/);
assert.match(report, /Decision: HOLD/);
assert.match(report, /reverse_coding_drift/);

console.log("survey psychometric validity assistant tests passed");
