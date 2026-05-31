"use strict";

const assert = require("assert");
const { analyzeArtifactPrunePlan, daysBetween } = require("./artifactPruneGuard");
const { sampleRepository } = require("./sampleRepository");

assert.strictEqual(daysBetween("2026-01-01T00:00:00.000Z", "2026-01-31T00:00:00.000Z"), 30);

const packet = analyzeArtifactPrunePlan(sampleRepository);
assert.strictEqual(packet.status, "blocked");
assert.strictEqual(packet.summary.candidates, 5);
assert.strictEqual(packet.summary.approved, 1);
assert.strictEqual(packet.summary.blocked, 4);
assert.deepStrictEqual(packet.approvedPrunes.map((item) => item.artifactId), ["orphan-scratch-plot"]);

const blockedCodes = new Map(
  packet.blockedPrunes.map((item) => [
    item.artifactId,
    item.blockers.map((blocker) => blocker.code),
  ]),
);
assert.deepStrictEqual(blockedCodes.get("fig-survival-curve"), [
  "CITATION_EVIDENCE_BOUND",
  "DOI_VERSION_BOUND",
]);
assert.deepStrictEqual(blockedCodes.get("raw-screening-table"), ["EXPORT_MANIFEST_BOUND"]);
assert(blockedCodes.get("notebook-run-packet").includes("REPRODUCIBILITY_PACKET_BOUND"));
assert(blockedCodes.get("notebook-run-packet").includes("MINIMUM_AGE_NOT_MET"));
assert(blockedCodes.get("protocol-appendix").includes("RETENTION_HOLD"));

const hashDriftPacket = analyzeArtifactPrunePlan({
  now: "2026-05-31T00:00:00.000Z",
  policy: { minimumUnreferencedAgeDays: 1 },
  artifacts: [
    {
      id: "model-card",
      path: "results/model-card.json",
      hash: "sha256:new",
      createdAt: "2026-05-01T00:00:00.000Z",
      lastReferencedAt: "2026-05-01T00:00:00.000Z",
    },
  ],
  references: [
    {
      source: "exports/v2/manifest.json",
      sourceType: "export",
      artifacts: [{ id: "model-card", hash: "sha256:old" }],
    },
  ],
  pruneCandidates: ["model-card"],
});
assert.strictEqual(hashDriftPacket.blockedPrunes[0].blockers[0].code, "REFERENCE_HASH_DRIFT");

const missingPacket = analyzeArtifactPrunePlan({
  artifacts: [],
  references: [],
  pruneCandidates: ["missing-artifact"],
  now: "2026-05-31T00:00:00.000Z",
});
assert.strictEqual(missingPacket.status, "blocked");
assert.strictEqual(missingPacket.warnings[0].code, "UNKNOWN_CANDIDATE");

console.log("artifact-prune-guard tests passed");
