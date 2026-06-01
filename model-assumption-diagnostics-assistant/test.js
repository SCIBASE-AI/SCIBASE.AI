import assert from "node:assert/strict";
import { cleanAnalysisPacket, riskyAnalysisPacket } from "./sample-data.js";
import { buildReviewerMarkdown, buildSummarySvg, reviewModelAssumptions } from "./index.js";

const risky = reviewModelAssumptions(riskyAnalysisPacket);
assert.equal(risky.decision, "hold-ai-review");
assert.ok(risky.riskScore >= 90);
assert.ok(risky.findings.some((finding) => finding.code === "MODEL_FAMILY_OUTCOME_MISMATCH"));
assert.ok(risky.findings.some((finding) => finding.code === "LOW_EVENTS_PER_PREDICTOR"));
assert.ok(risky.findings.some((finding) => finding.code === "SEPARATION_RISK"));
assert.ok(risky.findings.some((finding) => finding.code === "REVIEW_PACKET_INCOMPLETE"));
assert.ok(risky.findings.some((finding) => finding.code === "MULTICOLLINEARITY_HIGH"));

const clean = reviewModelAssumptions(cleanAnalysisPacket);
assert.equal(clean.decision, "ready-for-ai-review");
assert.equal(clean.summary.findingCount, 0);
assert.equal(clean.riskScore, 0);

assert.throws(() => reviewModelAssumptions(null), /analysis packet must be an object/);

const markdown = buildReviewerMarkdown(risky);
assert.match(markdown, /MODEL_FAMILY_OUTCOME_MISMATCH/);
assert.match(markdown, /hold-ai-review/);

const svg = buildSummarySvg(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Model Assumption Diagnostics/);

console.log("model-assumption diagnostics tests passed");
