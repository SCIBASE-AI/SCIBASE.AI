const assert = require("node:assert/strict");
const { evaluateRepository, recommendVersionImpact } = require("./index");
const { repository } = require("./sample-data");

const result = evaluateRepository(repository);

assert.equal(result.repository, "scibase-neurotoxicity-screen");
assert.equal(result.summary.total, 2);
assert.equal(result.summary.ready, 1);
assert.equal(result.summary.block, 1);

const readyPacket = result.packets.find(
  (packet) => packet.branch === "experiment/astrocyte-normalization",
);
assert.equal(readyPacket.decision, "ready");
assert.equal(readyPacket.versionImpact, "minor");
assert.deepEqual(readyPacket.findings, []);
assert.ok(
  readyPacket.citationNotes.some((note) => note.includes("schema.org")),
  "metadata changes should produce citation export notes",
);

const blockedPacket = result.packets.find(
  (packet) => packet.branch === "experiment/low-signal-staining",
);
assert.equal(blockedPacket.decision, "block");
assert.ok(blockedPacket.riskScore >= 120);
assert.ok(
  blockedPacket.findings.some((finding) => finding.code === "hypothesis-not-approved"),
);
assert.ok(
  blockedPacket.findings.some((finding) => finding.code === "protocol-not-frozen"),
);
assert.ok(
  blockedPacket.findings.some((finding) => finding.code === "missing-component-hash"),
);
assert.ok(
  blockedPacket.findings.some((finding) => finding.code === "large-file-not-lfs"),
);
assert.ok(
  blockedPacket.findings.some((finding) => finding.code === "result-input-missing"),
);
assert.ok(
  blockedPacket.citationNotes.some((note) => note.includes("DOI target")),
);

assert.equal(
  recommendVersionImpact(
    [{ type: "code" }],
    { authorsChanged: false, metadataChanged: false, doiTargetChanged: false },
  ),
  "patch",
);
assert.equal(
  recommendVersionImpact(
    [{ type: "protocol" }],
    { authorsChanged: false, metadataChanged: false, doiTargetChanged: false },
  ),
  "major",
);

console.log("repository branch hypothesis lineage gate tests passed");
