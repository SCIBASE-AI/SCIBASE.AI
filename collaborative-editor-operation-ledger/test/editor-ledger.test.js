import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoReport } from "../src/demo.js";
import { initialDocument, operations } from "../src/sample-data.js";
import {
  acceptSuggestion,
  addSuggestion,
  createDocument,
  createVersionSnapshot,
  exportPublicationOutline,
  replayOperations
} from "../src/editor-ledger.js";

test("replays text, metadata, presence, and lock operations", () => {
  const document = replayOperations(createDocument(initialDocument), operations);

  assert.equal(document.presence.ada.status, "editing");
  assert.equal(document.blocks[0].content.includes("and humidity"), true);
  assert.equal(document.blocks[2].metadata.executionStatus, "reviewed");
  assert.equal(document.locks[0].active, true);
});

test("locks prevent edits by other collaborators", () => {
  const document = replayOperations(createDocument(initialDocument), operations);

  assert.throws(
    () =>
      replayOperations(document, [
        {
          type: "replace_text",
          actorId: "ada",
          blockId: "equation-1",
          from: 0,
          to: 4,
          text: "score"
        }
      ]),
    /locked by mir/
  );
});

test("suggestions can be accepted as replayable text operations", () => {
  let document = createDocument(initialDocument);
  document = addSuggestion(document, {
    id: "s1",
    blockId: "intro",
    authorId: "lin",
    from: 0,
    to: 5,
    replacement: "Neighborhood"
  });
  document = acceptSuggestion(document, "s1", "ada");

  assert.equal(document.blocks[0].content.startsWith("Neighborhood"), true);
  assert.equal(document.suggestions[0].status, "accepted");
});

test("version snapshots and outline capture review state", () => {
  let document = replayOperations(createDocument(initialDocument), operations);
  document = createVersionSnapshot(document, {
    id: "v1",
    label: "Draft",
    actorId: "ada"
  });
  const outline = exportPublicationOutline(document);

  assert.equal(outline.blocks.length, 3);
  assert.equal(outline.latestVersion.label, "Draft");
});

test("demo report includes document and publication outline", () => {
  const report = buildDemoReport();

  assert.equal(report.document.comments.length, 1);
  assert.equal(report.document.tasks.length, 1);
  assert.equal(report.outline.openTasks, 1);
  assert.equal(report.outline.pendingSuggestions, 0);
});
