const assert = require("assert");
const { evaluateFootnoteExport } = require("./footnoteExportGuard");
const sampleWorkspace = require("./sampleWorkspace");

const result = evaluateFootnoteExport(sampleWorkspace);

assert.equal(result.decision, "block-export");
assert.equal(result.summary.sections, 3);
assert.equal(result.summary.notes, 4);
assert.equal(result.summary.markers, 4);
assert.ok(result.findings.some((finding) => finding.id === "orphan-marker:fn-5"));
assert.ok(result.findings.some((finding) => finding.id === "private-note:fn-2"));
assert.ok(result.findings.some((finding) => finding.id === "locked-section-note-edit:fn-2"));
assert.ok(result.findings.some((finding) => finding.id === "missing-citation:fn-3"));
assert.ok(result.findings.some((finding) => finding.id === "unused-note:fn-4"));
assert.ok(result.findings.some((finding) => finding.id === "duplicate-marker:fn-2"));
assert.ok(result.findings.some((finding) => finding.id === "endnote-order:fn-2"));

const cleanWorkspace = {
  id: "editor-room-clean",
  sections: [
    { id: "intro", locked: false, markers: ["fn-1"] },
    { id: "methods", locked: true, lockReason: "final-review", markers: ["fn-2"] }
  ],
  notes: [
    {
      id: "fn-1",
      sectionId: "intro",
      text: "Open science statement.",
      visibility: "public",
      requiresCitation: true,
      citationKey: "nguyen2026open",
      exportedOrder: 1,
      modifiedAfterLock: false
    },
    {
      id: "fn-2",
      sectionId: "methods",
      text: "Instrument model reference.",
      visibility: "public",
      requiresCitation: false,
      exportedOrder: 2,
      modifiedAfterLock: false
    }
  ]
};

const cleanResult = evaluateFootnoteExport(cleanWorkspace);
assert.equal(cleanResult.decision, "ready-for-export");
assert.equal(cleanResult.findings.length, 0);

console.log("footnote export guard tests passed");
