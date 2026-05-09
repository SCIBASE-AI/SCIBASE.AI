import assert from "node:assert/strict";
import { test } from "node:test";
import { CollaborationSession, createDocument } from "../src/editor-core.js";

test("applies block, comment, suggestion, task, and presence operations", () => {
  const session = new CollaborationSession(createDocument({ title: "Test Protocol" }));
  const firstBlockId = session.document.blocks[0].id;

  session.applyOperation({
    type: "insert-block",
    blockType: "code",
    content: "print('reproducible')",
    metadata: { language: "python" },
  });
  session.applyOperation({
    type: "comment",
    blockId: firstBlockId,
    author: "Reviewer",
    body: "Cite the source dataset.",
  });
  session.applyOperation({
    type: "suggestion",
    blockId: firstBlockId,
    author: "Editor",
    replacement: "# Revised abstract",
  });
  session.applyOperation({
    type: "task",
    blockId: firstBlockId,
    assignee: "Analyst",
    title: "Run notebook smoke test",
  });
  session.applyOperation({
    type: "presence",
    userId: "reviewer-1",
    name: "Reviewer One",
    blockId: firstBlockId,
    cursor: 4,
  });

  const manifest = session.exportManifest();
  assert.equal(manifest.blockCount, 4);
  assert.equal(manifest.openComments, 1);
  assert.equal(manifest.openSuggestions, 1);
  assert.equal(manifest.openTasks, 1);
  assert.equal(manifest.activeCollaborators, 1);
});

test("locks finalized sections against destructive edits", () => {
  const session = new CollaborationSession(createDocument());
  const firstBlockId = session.document.blocks[0].id;

  session.applyOperation({
    type: "lock-section",
    blockId: firstBlockId,
    author: "PI",
    reason: "Approved manuscript abstract",
  });

  assert.throws(
    () =>
      session.applyOperation({
        type: "update-block",
        blockId: firstBlockId,
        content: "mutated",
      }),
    /locked/,
  );
});

test("captures named version snapshots for time-machine restore UI", () => {
  const session = new CollaborationSession(createDocument());

  session.applyOperation({
    type: "save-version",
    label: "Submission draft",
    author: "PI",
  });

  assert.equal(session.document.version, 2);
  assert.equal(session.document.history.length, 1);
  assert.equal(session.document.history[0].label, "Submission draft");
  assert.equal(session.document.history[0].snapshot.version, 1);
});
