const clone = (value) => JSON.parse(JSON.stringify(value));

export function createBlock({ id, type, section, content = "", ...metadata }) {
  if (!id || !type || !section) {
    throw new Error("Block requires id, type, and section.");
  }
  return { id, type, section, content, ...metadata };
}

function findBlockIndex(document, blockId) {
  const index = document.blocks.findIndex((block) => block.id === blockId);
  if (index === -1) throw new Error(`Unknown block: ${blockId}`);
  return index;
}

function ensureWritable(document, section, actor) {
  const lock = document.locks.find((item) => item.section === section);
  if (lock && lock.owner !== actor) {
    throw new Error(`Section ${section} is locked by ${lock.owner}: ${lock.reason}`);
  }
}

export function lockSection(document, section, owner, reason) {
  const next = clone(document);
  next.locks = next.locks.filter((lock) => lock.section !== section);
  next.locks.push({ section, owner, reason });
  next.revision += 1;
  return next;
}

export function unlockSection(document, section, owner) {
  const next = clone(document);
  const lock = next.locks.find((item) => item.section === section);
  if (lock && lock.owner !== owner) {
    throw new Error(`Only ${lock.owner} can unlock ${section}.`);
  }
  next.locks = next.locks.filter((item) => item.section !== section);
  next.revision += 1;
  return next;
}

export function applyOperation(document, operation) {
  const next = clone(document);
  if (operation.type === "insert-block") {
    ensureWritable(next, operation.block.section, operation.actor);
    const afterIndex = operation.afterBlockId ? findBlockIndex(next, operation.afterBlockId) : next.blocks.length - 1;
    next.blocks.splice(afterIndex + 1, 0, createBlock(operation.block));
  } else if (operation.type === "update-block") {
    const index = findBlockIndex(next, operation.blockId);
    ensureWritable(next, next.blocks[index].section, operation.actor);
    next.blocks[index] = { ...next.blocks[index], content: operation.content, updatedBy: operation.actor };
  } else if (operation.type === "delete-block") {
    const index = findBlockIndex(next, operation.blockId);
    ensureWritable(next, next.blocks[index].section, operation.actor);
    next.blocks.splice(index, 1);
  } else {
    throw new Error(`Unsupported operation type: ${operation.type}`);
  }
  next.revision += 1;
  next.lastOperationId = operation.id;
  return next;
}

export function applyOperationBatch(document, operations) {
  return operations.reduce((current, operation) => applyOperation(current, operation), document);
}

export function buildPresenceState(users) {
  return {
    activeUsers: users.length,
    cursors: users.map((user) => ({
      userId: user.userId,
      name: user.name,
      blockId: user.blockId,
      selection: user.selection,
      status: user.status
    }))
  };
}

export function addCommentThread(document, { id, blockId, author, text }) {
  const next = clone(document);
  findBlockIndex(next, blockId);
  next.comments.push({
    id,
    blockId,
    status: "open",
    participants: [author],
    messages: [{ at: new Date("2026-05-14T00:00:00Z").toISOString(), author, text }]
  });
  next.revision += 1;
  return next;
}

export function applySuggestion(document, suggestionId, actor) {
  const next = clone(document);
  const suggestion = next.suggestions.find((item) => item.id === suggestionId);
  if (!suggestion) throw new Error(`Unknown suggestion: ${suggestionId}`);
  const index = findBlockIndex(next, suggestion.blockId);
  ensureWritable(next, next.blocks[index].section, actor);
  next.blocks[index].content = suggestion.replacement;
  suggestion.status = "accepted";
  suggestion.acceptedBy = actor;
  next.revision += 1;
  return next;
}

export function createTask(document, task) {
  const next = clone(document);
  findBlockIndex(next, task.blockId);
  next.tasks.push({ ...task, status: task.status ?? "todo" });
  next.revision += 1;
  return next;
}

export function transitionTask(document, taskId, status) {
  const next = clone(document);
  const task = next.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);
  task.status = status;
  next.revision += 1;
  return next;
}

export function createSnapshot(document, name, autosave = false) {
  const next = clone(document);
  const snapshot = {
    id: `v-${next.versions.length + 1}`,
    name,
    autosave,
    revision: next.revision,
    createdAt: new Date("2026-05-14T00:00:00Z").toISOString(),
    blocks: clone(next.blocks)
  };
  next.versions.push(snapshot);
  return { document: next, snapshot };
}

export function restoreSnapshot(document, snapshotId) {
  const snapshot = document.versions.find((version) => version.id === snapshotId);
  if (!snapshot) throw new Error(`Unknown snapshot: ${snapshotId}`);
  const next = clone(document);
  next.blocks = clone(snapshot.blocks);
  next.revision += 1;
  next.restoredFrom = snapshotId;
  return next;
}

export function exportPublicationOutline(document) {
  return {
    title: document.title,
    revision: document.revision,
    sections: document.blocks.reduce((sections, block) => {
      sections[block.section] ??= [];
      sections[block.section].push({
        id: block.id,
        type: block.type,
        label: block.label ?? null,
        references: block.references ?? [],
        preview: (block.content ?? block.source ?? "").slice(0, 120)
      });
      return sections;
    }, {})
  };
}

export function buildEditorSession(document, presence) {
  return {
    documentId: document.id,
    revision: document.revision,
    lockedSections: document.locks,
    presence: buildPresenceState(presence),
    openComments: document.comments.filter((comment) => comment.status === "open").length,
    openSuggestions: document.suggestions.filter((suggestion) => suggestion.status === "open").length,
    openTasks: document.tasks.filter((task) => task.status !== "done").length
  };
}
