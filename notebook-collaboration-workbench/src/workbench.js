import crypto from "node:crypto";

const VALID_CELL_TYPES = new Set(["markdown", "code", "latex", "raw"]);
const VALID_SEVERITIES = new Set(["note", "warning", "blocker"]);
const VALID_TASK_STATUSES = new Set(["todo", "in-progress", "blocked", "done"]);

export function cloneNotebook(notebook) {
  return JSON.parse(JSON.stringify(notebook));
}

export function hashText(value) {
  return `sha256:${crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 12)}`;
}

export function validateNotebook(notebook) {
  const errors = [];
  const cellIds = new Set();
  const collaboratorIds = new Set(notebook.collaborators.map((person) => person.id));
  const kernelIds = new Set(notebook.kernels.map((kernel) => kernel.id));

  for (const cell of notebook.cells) {
    if (cellIds.has(cell.id)) {
      errors.push(`duplicate cell id: ${cell.id}`);
    }
    cellIds.add(cell.id);

    if (!VALID_CELL_TYPES.has(cell.type)) {
      errors.push(`unsupported cell type for ${cell.id}: ${cell.type}`);
    }

    if (cell.type === "code" && !kernelIds.has(cell.kernelId)) {
      errors.push(`code cell ${cell.id} references missing kernel ${cell.kernelId}`);
    }

    if (cell.lockedBy && !collaboratorIds.has(cell.lockedBy)) {
      errors.push(`cell ${cell.id} locked by unknown collaborator ${cell.lockedBy}`);
    }
  }

  for (const execution of notebook.queuedExecutions) {
    if (!cellIds.has(execution.cellId)) {
      errors.push(`execution ${execution.id} references missing cell ${execution.cellId}`);
    }
    if (!kernelIds.has(execution.kernelId)) {
      errors.push(`execution ${execution.id} references missing kernel ${execution.kernelId}`);
    }
    if (!collaboratorIds.has(execution.requesterId)) {
      errors.push(`execution ${execution.id} requested by unknown collaborator ${execution.requesterId}`);
    }
  }

  for (const annotation of notebook.annotations) {
    if (!cellIds.has(annotation.cellId)) {
      errors.push(`annotation ${annotation.id} references missing cell ${annotation.cellId}`);
    }
    if (!collaboratorIds.has(annotation.authorId)) {
      errors.push(`annotation ${annotation.id} has unknown author ${annotation.authorId}`);
    }
    if (!VALID_SEVERITIES.has(annotation.severity)) {
      errors.push(`annotation ${annotation.id} has invalid severity ${annotation.severity}`);
    }
  }

  for (const task of notebook.tasks) {
    if (!cellIds.has(task.cellId)) {
      errors.push(`task ${task.id} references missing cell ${task.cellId}`);
    }
    if (!collaboratorIds.has(task.assigneeId)) {
      errors.push(`task ${task.id} assigned to unknown collaborator ${task.assigneeId}`);
    }
    if (!VALID_TASK_STATUSES.has(task.status)) {
      errors.push(`task ${task.id} has invalid status ${task.status}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    counts: {
      cells: notebook.cells.length,
      codeCells: notebook.cells.filter((cell) => cell.type === "code").length,
      collaborators: notebook.collaborators.length,
      kernels: notebook.kernels.length,
      queuedExecutions: notebook.queuedExecutions.length,
      openAnnotations: notebook.annotations.filter((annotation) => annotation.status === "open").length,
      openTasks: notebook.tasks.filter((task) => task.status !== "done").length,
    },
  };
}

export function planExecutionQueue(notebook, now = new Date("2026-05-15T00:16:00.000Z")) {
  const cells = new Map(notebook.cells.map((cell) => [cell.id, cell]));
  const kernels = new Map(notebook.kernels.map((kernel) => [kernel.id, kernel]));

  return notebook.queuedExecutions.map((execution, index) => {
    const cell = cells.get(execution.cellId);
    const kernel = kernels.get(execution.kernelId);
    const inputHash = hashText(cell?.source ?? "");
    const leaseExpired = kernel ? new Date(kernel.leaseExpiresAt) <= now : true;
    const blockedByLock = Boolean(cell?.lockedBy && cell.lockedBy !== execution.requesterId);
    const staleInput = execution.expectedInputHash !== inputHash;
    const ready = Boolean(cell && kernel && !leaseExpired && !blockedByLock && !staleInput);

    return {
      executionId: execution.id,
      cellId: execution.cellId,
      kernelId: execution.kernelId,
      order: index + 1,
      inputHash,
      ready,
      reasons: [
        !cell ? "missing-cell" : null,
        !kernel ? "missing-kernel" : null,
        leaseExpired ? "kernel-lease-expired" : null,
        blockedByLock ? `locked-by-${cell.lockedBy}` : null,
        staleInput ? "input-hash-changed" : null,
      ].filter(Boolean),
    };
  });
}

export function recordExecutionSnapshot(notebook, executionId, result) {
  const next = cloneNotebook(notebook);
  const execution = next.queuedExecutions.find((item) => item.id === executionId);
  if (!execution) {
    throw new Error(`Cannot record missing execution: ${executionId}`);
  }

  const cell = next.cells.find((item) => item.id === execution.cellId);
  if (!cell) {
    throw new Error(`Cannot record execution for missing cell: ${execution.cellId}`);
  }

  const snapshot = {
    id: `out-${executionId}`,
    cellId: cell.id,
    executionId,
    status: result.status ?? "ok",
    outputType: result.outputType ?? "text",
    contentHash: hashText(result.content ?? result.summary ?? ""),
    summary: result.summary ?? String(result.content ?? "").slice(0, 120),
    createdAt: result.createdAt ?? new Date().toISOString(),
    reproducible: Boolean(result.reproducible),
  };

  next.outputSnapshots.push(snapshot);
  next.queuedExecutions = next.queuedExecutions.filter((item) => item.id !== executionId);
  return { notebook: next, snapshot };
}

export function annotateCell(notebook, input) {
  if (!notebook.cells.some((cell) => cell.id === input.cellId)) {
    throw new Error(`Cannot annotate missing cell: ${input.cellId}`);
  }
  if (!VALID_SEVERITIES.has(input.severity)) {
    throw new Error(`Invalid annotation severity: ${input.severity}`);
  }

  const next = cloneNotebook(notebook);
  const annotation = {
    id: input.id ?? `ann-${String(next.annotations.length + 1).padStart(3, "0")}`,
    cellId: input.cellId,
    authorId: input.authorId,
    anchor: input.anchor ?? { line: 1, column: 0 },
    severity: input.severity,
    text: input.text,
    status: "open",
  };
  next.annotations.push(annotation);
  return { notebook: next, annotation };
}

export function buildVersionManifest(notebook, name, createdAt = "2026-05-15T00:20:00.000Z") {
  const cellHashes = Object.fromEntries(
    notebook.cells.map((cell) => [
      cell.id,
      hashText(`${cell.type}:${cell.language ?? ""}:${cell.source}`),
    ]),
  );
  const outputHashes = Object.fromEntries(
    notebook.outputSnapshots.map((snapshot) => [snapshot.id, snapshot.contentHash]),
  );

  return {
    id: `v${notebook.documentVersion + 1}`,
    name,
    createdAt,
    cells: notebook.cells.length,
    kernels: notebook.kernels.map((kernel) => ({
      id: kernel.id,
      language: kernel.language,
      packages: kernel.packages,
    })),
    cellHashes,
    outputHashes,
    openReviewItems: notebook.annotations.filter((annotation) => annotation.status === "open").length,
    openTasks: notebook.tasks.filter((task) => task.status !== "done").length,
  };
}

export function buildReviewDashboard(notebook) {
  const validation = validateNotebook(notebook);
  const executionPlan = planExecutionQueue(notebook);
  const blockerAnnotations = notebook.annotations.filter(
    (annotation) => annotation.status === "open" && annotation.severity === "blocker",
  );
  const lockedCells = notebook.cells
    .filter((cell) => cell.lockedBy)
    .map((cell) => ({ cellId: cell.id, lockedBy: cell.lockedBy }));

  return {
    notebookId: notebook.id,
    title: notebook.title,
    validation,
    presence: notebook.collaborators.map((person) => ({
      collaboratorId: person.id,
      name: person.name,
      activeKernel: person.activeKernel,
      cursor: person.cursor,
    })),
    executionPlan,
    latestOutputs: notebook.outputSnapshots.slice(-5),
    reviewReadiness: {
      readyForMilestone: validation.valid && blockerAnnotations.length === 0 && executionPlan.every((item) => item.ready),
      blockers: blockerAnnotations.map((annotation) => ({
        annotationId: annotation.id,
        cellId: annotation.cellId,
        text: annotation.text,
      })),
      lockedCells,
      openTasks: notebook.tasks.filter((task) => task.status !== "done"),
    },
    versionManifest: buildVersionManifest(notebook, "Notebook review candidate"),
  };
}

export function buildNotebookPackage(notebook) {
  const dashboard = buildReviewDashboard(notebook);
  return {
    manifestVersion: "notebook-collaboration-workbench/v0.1",
    notebookId: notebook.id,
    documentVersion: notebook.documentVersion,
    exportedAt: "2026-05-15T00:25:00.000Z",
    cells: notebook.cells.map((cell) => ({
      id: cell.id,
      type: cell.type,
      language: cell.language ?? null,
      sourceHash: hashText(cell.source),
      lockedBy: cell.lockedBy,
    })),
    kernels: notebook.kernels.map((kernel) => ({
      id: kernel.id,
      language: kernel.language,
      status: kernel.status,
      packageHash: hashText(kernel.packages.join("|")),
    })),
    outputs: notebook.outputSnapshots.map((snapshot) => ({
      id: snapshot.id,
      cellId: snapshot.cellId,
      contentHash: snapshot.contentHash,
      reproducible: snapshot.reproducible,
    })),
    review: dashboard.reviewReadiness,
  };
}
