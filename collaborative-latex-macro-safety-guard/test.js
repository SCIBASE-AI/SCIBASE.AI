const assert = require("node:assert/strict");
const {
  createGuardReport,
  evaluateMacroPacket,
  renderMarkdown,
  renderSvg,
} = require("./index");
const { samplePackets } = require("./sample-data");

const ready = evaluateMacroPacket(samplePackets[0]);
assert.equal(ready.status, "ready");
assert.equal(ready.renderDecision.allowLivePreview, true);
assert.equal(ready.renderDecision.allowNamedVersionExport, true);

const blocked = evaluateMacroPacket(samplePackets[1]);
assert.equal(blocked.status, "blocked");
assert.equal(blocked.renderDecision.allowLivePreview, false);
assert.ok(
  blocked.issues.some((issue) => issue.code === "UNSAFE_MACRO_COMMAND"),
);
assert.ok(
  blocked.issues.some((issue) => issue.code === "RECURSIVE_MACRO_EXPANSION"),
);
assert.ok(
  blocked.issues.some((issue) => issue.code === "MACRO_DEFINITION_CONFLICT"),
);
assert.ok(
  blocked.issues.some((issue) => issue.code === "RAW_HTML_IN_COLLAB_BLOCK"),
);
assert.ok(
  blocked.issues.some(
    (issue) => issue.code === "EXTERNAL_RENDER_RESOURCE_BLOCKED",
  ),
);
assert.ok(
  blocked.issues.some((issue) => issue.code === "LOCKED_SECTION_RENDER_HOLD"),
);

const review = evaluateMacroPacket(samplePackets[2]);
assert.equal(review.status, "needs_review");
assert.equal(review.renderDecision.allowLivePreview, true);
assert.equal(review.renderDecision.allowTrustedKatexRender, false);
assert.ok(
  review.issues.some(
    (issue) => issue.code === "TRUSTED_MACRO_REVIEW_REQUIRED",
  ),
);

const report = createGuardReport(samplePackets);
assert.deepEqual(report.totals, {
  packets: 3,
  ready: 1,
  needsReview: 1,
  blocked: 1,
  blockingIssues: 10,
  warnings: 1,
});

const markdown = renderMarkdown(report);
assert.match(markdown, /Collaborative LaTeX Macro Safety Guard/);
assert.match(markdown, /RECURSIVE_MACRO_EXPANSION/);
assert.match(markdown, /Named-version export gate/);

const svg = renderSvg(report);
assert.match(svg, /<svg/);
assert.match(svg, /packet-unsafe-results-v8/);
assert.match(svg, /blocked/);

assert.throws(
  () => evaluateMacroPacket({ packetId: "missing-document" }),
  /packet.documentId is required/,
);

console.log("collaborative-latex-macro-safety-guard tests passed");
