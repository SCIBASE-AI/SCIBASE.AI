const assert = require("assert");
const { evaluateMentionFanout } = require("./mentionScopeGuard");
const sampleWorkspace = require("./sampleWorkspace");

const result = evaluateMentionFanout(sampleWorkspace);

assert.equal(result.decision, "block-mention-fanout");
assert.ok(result.findings.some((finding) => finding.id === "section-scope:thread-1:u-reviewer"));
assert.ok(result.findings.some((finding) => finding.id === "blinded-reviewer-leak:thread-1:u-reviewer"));
assert.ok(result.findings.some((finding) => finding.id === "section-scope:thread-1:u-contractor"));
assert.ok(result.findings.some((finding) => finding.id === "external-restricted-section:thread-1:u-contractor"));
assert.ok(result.findings.some((finding) => finding.id === "notebook-cell-scope:thread-1:u-contractor"));
assert.ok(result.findings.some((finding) => finding.id === "locked-section-mention:thread-1"));
assert.ok(result.findings.some((finding) => finding.id === "private-title-preview:thread-1"));

const cleanResult = evaluateMentionFanout({
  id: "clean-editor-room",
  users: [{ id: "u-a", displayName: "Author", role: "author", external: false }],
  sections: [{ id: "intro", title: "Intro", members: ["u-a"], restricted: false, locked: false, privateTitle: false }],
  notebookCells: [],
  chatThreads: [{ id: "t-ok", sectionId: "intro", visibility: "project-visible", mentions: ["u-a"], sectionOwnerApproved: true, fanoutPreview: "New mention in Intro" }]
});

assert.equal(cleanResult.decision, "ready-for-mention-fanout");
assert.equal(cleanResult.findings.length, 0);

console.log("chat mention scope guard tests passed");
