import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRebuttalResponsePack } from "../src/rebuttal-response-pack.js";
import samplePacket from "../data/sample-review-packet.json" with { type: "json" };

describe("buildRebuttalResponsePack", () => {
  it("creates one response row per reviewer concern", () => {
    const pack = buildRebuttalResponsePack(samplePacket);
    assert.equal(pack.responseMatrix.length, samplePacket.reviews.length);
    assert.equal(pack.manuscriptId, "ms-graph-retrieval-2026");
  });

  it("classifies statistical and reproducibility concerns deterministically", () => {
    const pack = buildRebuttalResponsePack(samplePacket);
    const topics = pack.responseMatrix.map((row) => row.concernTopic);
    assert.ok(topics.includes("statistical support"));
    assert.ok(topics.includes("reproducibility"));
  });

  it("requests missing evidence for high-risk responses", () => {
    const pack = buildRebuttalResponsePack(samplePacket);
    const highRiskRows = pack.responseMatrix.filter((row) => row.unresolvedRisk);
    assert.ok(highRiskRows.length >= 1);
    assert.ok(highRiskRows.some((row) => row.evidenceRequests.length > 0));
  });

  it("exports an editor-facing readiness summary", () => {
    const pack = buildRebuttalResponsePack(samplePacket);
    assert.match(pack.resubmissionReadiness.status, /revision|ready|not-ready/);
    assert.equal(pack.editorSummary.responseCount, 4);
    assert.ok(Array.isArray(pack.editorSummary.highRiskResponses));
  });
});
