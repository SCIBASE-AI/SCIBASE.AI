const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  createRedlinePacket,
  digest,
  stableStringify,
  validateManifest
} = require("../src/redline-packet");

const samplePath = path.join(__dirname, "..", "data", "sample-manuscript.json");

function loadSample() {
  return JSON.parse(fs.readFileSync(samplePath, "utf8"));
}

test("creates revise-before-submit packet with evidence, statistics, and compliance redlines", () => {
  const packet = createRedlinePacket(loadSample());

  assert.equal(packet.decision, "revise-before-submit");
  assert.equal(packet.summary.redlines, 5);
  assert.equal(packet.summary.blockers, 2);
  assert.equal(packet.summary.revisionTasks, 5);
  assert.match(packet.auditDigest, /^sha256:[a-f0-9]{64}$/);
});

test("flags unsupported broad claims as blockers", () => {
  const packet = createRedlinePacket(loadSample());
  const redline = packet.redlines.find((item) => item.id === "evidence-claim-eliminates-batch-effects");

  assert.equal(redline.severity, "blocker");
  assert.equal(redline.type, "evidence");
  assert.match(redline.message, /no linked evidence/);
});

test("detects inconsistent p-value significance language and missing confidence interval", () => {
  const packet = createRedlinePacket(loadSample());
  const ids = packet.redlines.map((redline) => redline.id);

  assert.equal(ids.includes("stat-significance-stat-viability-pvalue"), true);
  assert.equal(ids.includes("stat-ci-stat-viability-pvalue"), true);
});

test("ranks citation recommendations based on claim redlines", () => {
  const packet = createRedlinePacket(loadSample());

  assert.equal(packet.citationRecommendations[0].id, "lee-2025-donor-batch-effects");
  assert.equal(packet.citationRecommendations[1].id, "nguyen-2024-viability-statistics");
});

test("builds insertion-ready revision tasks", () => {
  const packet = createRedlinePacket(loadSample());

  assert.equal(packet.revisionTasks.every((task) => task.readyForInsert), true);
  assert.equal(
    packet.revisionTasks.some((task) => task.action.includes("Donor-line batch effects")),
    true
  );
});

test("routes redlines to relevant reviewer templates", () => {
  const packet = createRedlinePacket(loadSample());
  const stats = packet.templateRouting.find((template) => template.id === "statistical-methods");

  assert.equal(stats.recommended, true);
  assert.deepEqual(stats.matchedTopics.sort(), ["effect-size", "sample-size", "statistics"]);
});

test("validates manifest shape", () => {
  const manifest = loadSample();
  delete manifest.manuscript.id;

  const errors = validateManifest(manifest);

  assert.equal(errors.some((error) => error.includes("manuscript.id")), true);
});

test("uses deterministic stable digests", () => {
  const left = { b: 2, a: { d: 4, c: 3 } };
  const right = { a: { c: 3, d: 4 }, b: 2 };

  assert.equal(stableStringify(left), stableStringify(right));
  assert.equal(digest(left), digest(right));
});
