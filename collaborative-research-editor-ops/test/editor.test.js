import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addCommentThread,
  applyOperation,
  applyOperationBatch,
  applySuggestion,
  buildEditorSession,
  createSnapshot,
  exportPublicationOutline,
  lockSection,
  restoreSnapshot,
  transitionTask,
  unlockSection
} from "../src/editor.js";
import { sampleDocument, sampleOperations, samplePresence } from "../src/sample-data.js";

test("operation batch updates document revision and inserts code block", () => {
  const result = applyOperationBatch(sampleDocument, sampleOperations);

  assert.equal(result.revision, sampleDocument.revision + 2);
  assert.ok(result.blocks.some((block) => block.id === "b-code-qc" && block.type === "code"));
  assert.match(result.blocks.find((block) => block.id === "b-intro").content, /collaborative/);
});

test("section locks reject edits from non-owner and allow owner", () => {
  assert.throws(
    () =>
      applyOperation(sampleDocument, {
        id: "op-locked",
        type: "update-block",
        actor: "analyst",
        blockId: "b-figure",
        content: "New result"
      }),
    /locked by lead-author/
  );

  const unlocked = unlockSection(sampleDocument, "results", "lead-author");
  const edited = applyOperation(unlocked, {
    id: "op-owner",
    type: "update-block",
    actor: "analyst",
    blockId: "b-figure",
    content: "Updated result figure."
  });
  assert.equal(edited.blocks.find((block) => block.id === "b-figure").content, "Updated result figure.");
});

test("comments, suggestions, and tasks update collaborative metadata", () => {
  const commented = addCommentThread(sampleDocument, {
    id: "c-2",
    blockId: "b-equation",
    author: "reviewer-b",
    text: "Please define sigma."
  });
  const suggested = applySuggestion(commented, "s-1", "lead-author");
  const transitioned = transitionTask(suggested, "t-1", "in-progress");

  assert.equal(commented.comments.length, sampleDocument.comments.length + 1);
  assert.equal(suggested.suggestions.find((item) => item.id === "s-1").status, "accepted");
  assert.equal(transitioned.tasks.find((task) => task.id === "t-1").status, "in-progress");
});

test("snapshots can be created and restored", () => {
  const edited = applyOperationBatch(sampleDocument, sampleOperations);
  const { document, snapshot } = createSnapshot(edited, "Manuscript v1 Draft");
  const locked = lockSection(document, "methods", "lead-author", "Submission freeze");
  const restored = restoreSnapshot(locked, snapshot.id);

  assert.equal(snapshot.revision, edited.revision);
  assert.equal(restored.restoredFrom, snapshot.id);
  assert.deepEqual(
    restored.blocks.map((block) => block.id),
    snapshot.blocks.map((block) => block.id)
  );
});

test("session and publication export expose editor review payloads", () => {
  const edited = applyOperationBatch(sampleDocument, sampleOperations);
  const session = buildEditorSession(edited, samplePresence);
  const exported = exportPublicationOutline(edited);

  assert.equal(session.presence.activeUsers, 3);
  assert.equal(session.openComments, 1);
  assert.ok(exported.sections.analysis.some((block) => block.type === "notebook"));
  assert.ok(exported.sections.methods.some((block) => block.label === "eq:response-index"));
});
