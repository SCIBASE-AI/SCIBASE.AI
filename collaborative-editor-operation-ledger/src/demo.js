import {
  acceptSuggestion,
  addInlineComment,
  addSuggestion,
  assignTask,
  createDocument,
  createVersionSnapshot,
  exportPublicationOutline,
  replayOperations
} from "./editor-ledger.js";
import { initialDocument, operations } from "./sample-data.js";

export function buildDemoReport() {
  let document = createDocument(initialDocument);
  document = replayOperations(document, operations);
  document = addInlineComment(document, {
    id: "comment-1",
    blockId: "notebook-1",
    authorId: "ada",
    selector: "cell:1",
    body: "Please attach the rendered model summary table."
  });
  document = addSuggestion(document, {
    id: "suggestion-1",
    blockId: "intro",
    authorId: "lin",
    from: 0,
    to: 5,
    replacement: "Neighborhood"
  });
  document = acceptSuggestion(document, "suggestion-1", "ada");
  document = assignTask(document, {
    id: "task-1",
    blockId: "notebook-1",
    assigneeId: "mir",
    dueDate: "2026-05-20",
    title: "Attach reproducibility output"
  });
  document = createVersionSnapshot(document, {
    id: "v1-draft",
    label: "Manuscript v1 Draft",
    actorId: "ada"
  });

  return {
    document,
    outline: exportPublicationOutline(document)
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(buildDemoReport(), null, 2));
}
