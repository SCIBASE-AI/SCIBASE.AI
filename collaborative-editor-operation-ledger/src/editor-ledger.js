function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findBlock(document, blockId) {
  const block = document.blocks.find((candidate) => candidate.id === blockId);
  if (!block) {
    throw new Error(`Unknown block: ${blockId}`);
  }
  return block;
}

function assertUnlocked(document, blockId, actorId) {
  const lock = document.locks.find(
    (candidate) => candidate.blockId === blockId && candidate.active
  );
  if (lock && lock.ownerId !== actorId) {
    throw new Error(`Block ${blockId} is locked by ${lock.ownerId}`);
  }
}

export function createDocument({ id, title, blocks }) {
  return {
    id,
    title,
    blocks: blocks.map((block, index) => ({ order: index + 1, ...block })),
    comments: [],
    suggestions: [],
    tasks: [],
    locks: [],
    presence: {},
    versions: [],
    operationLog: []
  };
}

export function applyOperation(document, operation) {
  const next = clone(document);
  next.operationLog.push(operation);

  if (operation.type === "insert_text") {
    assertUnlocked(next, operation.blockId, operation.actorId);
    const block = findBlock(next, operation.blockId);
    block.content =
      block.content.slice(0, operation.offset) +
      operation.text +
      block.content.slice(operation.offset);
  }

  if (operation.type === "replace_text") {
    assertUnlocked(next, operation.blockId, operation.actorId);
    const block = findBlock(next, operation.blockId);
    block.content =
      block.content.slice(0, operation.from) +
      operation.text +
      block.content.slice(operation.to);
  }

  if (operation.type === "set_block_metadata") {
    assertUnlocked(next, operation.blockId, operation.actorId);
    const block = findBlock(next, operation.blockId);
    block.metadata = { ...(block.metadata || {}), ...operation.metadata };
  }

  if (operation.type === "presence") {
    next.presence[operation.actorId] = {
      blockId: operation.blockId,
      cursor: operation.cursor,
      status: operation.status
    };
  }

  if (operation.type === "lock_block") {
    next.locks = next.locks.filter((lock) => lock.blockId !== operation.blockId);
    next.locks.push({
      blockId: operation.blockId,
      ownerId: operation.actorId,
      reason: operation.reason,
      active: true
    });
  }

  if (operation.type === "unlock_block") {
    next.locks = next.locks.map((lock) =>
      lock.blockId === operation.blockId && lock.ownerId === operation.actorId
        ? { ...lock, active: false }
        : lock
    );
  }

  return next;
}

export function addInlineComment(document, comment) {
  const next = clone(document);
  findBlock(next, comment.blockId);
  next.comments.push({
    id: comment.id,
    blockId: comment.blockId,
    authorId: comment.authorId,
    selector: comment.selector,
    body: comment.body,
    status: comment.status || "open"
  });
  return next;
}

export function addSuggestion(document, suggestion) {
  const next = clone(document);
  findBlock(next, suggestion.blockId);
  next.suggestions.push({
    id: suggestion.id,
    blockId: suggestion.blockId,
    authorId: suggestion.authorId,
    from: suggestion.from,
    to: suggestion.to,
    replacement: suggestion.replacement,
    status: "pending"
  });
  return next;
}

export function acceptSuggestion(document, suggestionId, actorId) {
  const next = clone(document);
  const suggestion = next.suggestions.find((item) => item.id === suggestionId);
  if (!suggestion) {
    throw new Error(`Unknown suggestion: ${suggestionId}`);
  }
  const changed = applyOperation(next, {
    type: "replace_text",
    actorId,
    blockId: suggestion.blockId,
    from: suggestion.from,
    to: suggestion.to,
    text: suggestion.replacement
  });
  changed.suggestions = changed.suggestions.map((item) =>
    item.id === suggestionId ? { ...item, status: "accepted" } : item
  );
  return changed;
}

export function assignTask(document, task) {
  const next = clone(document);
  findBlock(next, task.blockId);
  next.tasks.push({
    id: task.id,
    blockId: task.blockId,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate,
    status: task.status || "todo",
    title: task.title
  });
  return next;
}

export function createVersionSnapshot(document, { id, label, actorId }) {
  const next = clone(document);
  next.versions.push({
    id,
    label,
    actorId,
    blockCount: next.blocks.length,
    operationCount: next.operationLog.length,
    commentCount: next.comments.length,
    suggestionCount: next.suggestions.length
  });
  return next;
}

export function exportPublicationOutline(document) {
  return {
    documentId: document.id,
    title: document.title,
    blocks: document.blocks
      .sort((a, b) => a.order - b.order)
      .map((block) => ({
        id: block.id,
        kind: block.kind,
        label: block.label,
        metadata: block.metadata || {}
      })),
    openComments: document.comments.filter((comment) => comment.status === "open").length,
    pendingSuggestions: document.suggestions.filter(
      (suggestion) => suggestion.status === "pending"
    ).length,
    openTasks: document.tasks.filter((task) => task.status !== "done").length,
    latestVersion: document.versions.at(-1) || null
  };
}

export function replayOperations(document, operations) {
  return operations.reduce((current, operation) => applyOperation(current, operation), document);
}
