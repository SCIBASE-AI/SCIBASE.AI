import assert from "node:assert/strict";
import {
  evaluateFabricationAnomalyPacket,
  renderSummarySvg,
  summarizeReview,
} from "./src/assistant.js";
import { cleanPacket, riskyPacket } from "./src/samplePackets.js";

const clean = evaluateFabricationAnomalyPacket(cleanPacket);
assert.equal(clean.decision, "RELEASE");
assert.equal(clean.findingCount, 0);
assert.match(clean.auditDigest, /^[0-9a-f]{16}$/);

const risky = evaluateFabricationAnomalyPacket(riskyPacket);
assert.equal(risky.decision, "HOLD");
assert.ok(risky.findings.some((item) => item.id === "duplicate-measurement-rows"));
assert.ok(risky.findings.some((item) => item.id === "invalid-collection-timestamps"));
assert.ok(risky.findings.some((item) => item.id === "terminal-digit-preference"));
assert.ok(risky.findings.some((item) => item.id === "over-smooth-measurement-series"));
assert.ok(risky.findings.some((item) => item.id === "perfect-between-group-separation"));

const markdown = summarizeReview(risky);
assert.match(markdown, /Data fabrication anomaly review/);
assert.match(markdown, /HOLD/);
assert.match(markdown, /raw-data verification/);

const svg = renderSummarySvg(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Data Fabrication Anomaly Assistant/);

console.log("data fabrication anomaly assistant tests passed");
