const assert = require("assert");
const { evaluateModeToggle } = require("./modeToggleGuard");
const sampleSnapshot = require("./sampleSnapshot");

const result = evaluateModeToggle(sampleSnapshot);

assert.equal(result.decision, "block-mode-toggle-edit");
assert.ok(result.findings.some((finding) => finding.id === "equation-loss:methods-p2"));
assert.ok(result.findings.some((finding) => finding.id === "citation-loss:methods-p2"));
assert.ok(result.findings.some((finding) => finding.id === "notebook-link-loss:methods-p2"));
assert.ok(result.findings.some((finding) => finding.id === "comment-anchor-loss:methods-p2"));
assert.ok(result.findings.some((finding) => finding.id === "suggestion-loss:methods-p2"));
assert.ok(result.findings.some((finding) => finding.id === "locked-block-mutation:methods-p2"));

const clean = evaluateModeToggle({
  documentId: "clean-doc",
  fromMode: "markdown",
  toMode: "wysiwyg",
  before: [
    {
      id: "intro",
      locked: false,
      contentHash: "same",
      equations: ["eq-1"],
      citations: ["smith2026"],
      notebookLinks: [],
      commentAnchors: ["c1"],
      suggestionIds: []
    }
  ],
  after: [
    {
      id: "intro",
      locked: false,
      contentHash: "same",
      equations: ["eq-1"],
      citations: ["smith2026"],
      notebookLinks: [],
      commentAnchors: ["c1"],
      suggestionIds: []
    }
  ]
});

assert.equal(clean.decision, "ready-to-accept-toggle");
assert.equal(clean.findings.length, 0);

console.log("editor mode toggle fidelity guard tests passed");
