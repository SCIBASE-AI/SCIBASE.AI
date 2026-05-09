import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

export const BLOCK_TYPES = new Set([
  "markdown",
  "latex",
  "code",
  "figure",
  "table",
  "notebook-cell",
]);

export function createDocument({ title, authors = [], template = "research-note" } = {}) {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: title || "Untitled Research Document",
    template,
    authors,
    version: 1,
    createdAt: now,
    updatedAt: now,
    lockedSections: [],
    blocks: [
      createBlock("markdown", "# Abstract\n\nSummarize the research question, method, and key result."),
      createBlock("latex", "E = mc^2"),
      createBlock("notebook-cell", "import pandas as pd\nprint('ready')", {
        language: "python",
        executionState: "idle",
      }),
    ],
    comments: [],
    suggestions: [],
    tasks: [],
    history: [],
    presence: {},
  };
}

export function createBlock(type, content = "", metadata = {}) {
  if (!BLOCK_TYPES.has(type)) {
    throw new Error(`Unsupported block type: ${type}`);
  }

  return {
    id: randomUUID(),
    type,
    content,
    metadata: {
      citations: [],
      crossReferences: [],
      ...metadata,
    },
  };
}

export class CollaborationSession extends EventEmitter {
  constructor(document = createDocument()) {
    super();
    this.document = document;
  }

  applyOperation(operation) {
    const before = snapshot(this.document);
    const next = structuredClone(this.document);
    next.updatedAt = new Date().toISOString();

    switch (operation.type) {
      case "insert-block":
        insertBlock(next, operation);
        break;
      case "update-block":
        updateBlock(next, operation);
        break;
      case "move-block":
        moveBlock(next, operation);
        break;
      case "delete-block":
        deleteBlock(next, operation);
        break;
      case "comment":
        next.comments.push({
          id: randomUUID(),
          blockId: operation.blockId,
          author: operation.author,
          body: operation.body,
          resolved: false,
          createdAt: next.updatedAt,
        });
        break;
      case "suggestion":
        next.suggestions.push({
          id: randomUUID(),
          blockId: operation.blockId,
          author: operation.author,
          replacement: operation.replacement,
          reason: operation.reason || "",
          status: "open",
          createdAt: next.updatedAt,
        });
        break;
      case "task":
        next.tasks.push({
          id: randomUUID(),
          blockId: operation.blockId,
          assignee: operation.assignee,
          title: operation.title,
          dueAt: operation.dueAt || null,
          status: "open",
          createdAt: next.updatedAt,
        });
        break;
      case "presence":
        next.presence[operation.userId] = {
          name: operation.name,
          blockId: operation.blockId,
          cursor: operation.cursor || 0,
          updatedAt: next.updatedAt,
        };
        break;
      case "lock-section":
        next.lockedSections.push({
          id: randomUUID(),
          blockId: operation.blockId,
          reason: operation.reason || "Finalized section",
          lockedBy: operation.author,
          createdAt: next.updatedAt,
        });
        break;
      case "save-version":
        next.version += 1;
        next.history.push({
          id: randomUUID(),
          label: operation.label || `Version ${next.version}`,
          author: operation.author,
          createdAt: next.updatedAt,
          snapshot: before,
        });
        break;
      default:
        throw new Error(`Unsupported operation: ${operation.type}`);
    }

    this.document = next;
    this.emit("operation", { operation, document: this.document });
    return this.document;
  }

  renderPublicationOutline() {
    return this.document.blocks.map((block, index) => ({
      index,
      id: block.id,
      type: block.type,
      preview: renderPreview(block),
      citations: block.metadata.citations,
      crossReferences: block.metadata.crossReferences,
    }));
  }

  exportManifest() {
    return {
      documentId: this.document.id,
      title: this.document.title,
      version: this.document.version,
      blockCount: this.document.blocks.length,
      openComments: this.document.comments.filter((comment) => !comment.resolved).length,
      openSuggestions: this.document.suggestions.filter((suggestion) => suggestion.status === "open").length,
      openTasks: this.document.tasks.filter((task) => task.status === "open").length,
      activeCollaborators: Object.keys(this.document.presence).length,
      lockedSections: this.document.lockedSections.length,
    };
  }
}

function insertBlock(document, operation) {
  const block = createBlock(operation.blockType, operation.content, operation.metadata);
  const index = Number.isInteger(operation.index) ? operation.index : document.blocks.length;
  document.blocks.splice(Math.max(0, Math.min(index, document.blocks.length)), 0, block);
}

function updateBlock(document, operation) {
  const block = findBlock(document, operation.blockId);
  assertUnlocked(document, block.id);
  block.content = operation.content;
  block.metadata = { ...block.metadata, ...(operation.metadata || {}) };
}

function moveBlock(document, operation) {
  const fromIndex = document.blocks.findIndex((block) => block.id === operation.blockId);
  if (fromIndex < 0) throw new Error(`Block not found: ${operation.blockId}`);
  const [block] = document.blocks.splice(fromIndex, 1);
  const toIndex = Math.max(0, Math.min(operation.index, document.blocks.length));
  document.blocks.splice(toIndex, 0, block);
}

function deleteBlock(document, operation) {
  assertUnlocked(document, operation.blockId);
  const nextBlocks = document.blocks.filter((block) => block.id !== operation.blockId);
  if (nextBlocks.length === document.blocks.length) {
    throw new Error(`Block not found: ${operation.blockId}`);
  }
  document.blocks = nextBlocks;
}

function findBlock(document, blockId) {
  const block = document.blocks.find((candidate) => candidate.id === blockId);
  if (!block) throw new Error(`Block not found: ${blockId}`);
  return block;
}

function assertUnlocked(document, blockId) {
  const lock = document.lockedSections.find((section) => section.blockId === blockId);
  if (lock) {
    throw new Error(`Block ${blockId} is locked: ${lock.reason}`);
  }
}

function snapshot(document) {
  return JSON.parse(JSON.stringify(document));
}

function renderPreview(block) {
  const content = block.content.replace(/\s+/g, " ").trim();
  return content.length > 120 ? `${content.slice(0, 117)}...` : content;
}
