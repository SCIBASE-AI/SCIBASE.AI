import crypto from "node:crypto";

const REQUIRED_DIRECTORIES = new Set(["manuscript", "data", "code", "notebooks", "results", "protocols"]);
const STRUCTURED_FORMATS = new Set(["csv", "json", "ipynb"]);
const LFS_THRESHOLD_BYTES = 5_000_000;

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashValue(value) {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16)}`;
}

export function buildComponentManifest(repository) {
  const components = repository.components.map((component) => {
    const beforeHash = component.beforeHash ?? hashValue(component.before ?? null);
    const afterHash = component.afterHash ?? hashValue(component.after ?? null);
    const status = beforeHash === afterHash ? "unchanged" : "changed";

    return {
      id: component.id,
      directory: component.directory,
      path: component.path,
      type: component.type,
      format: component.format,
      editor: editorFor(component),
      status,
      beforeHash,
      afterHash,
      lfsCandidate: component.sizeBytes >= LFS_THRESHOLD_BYTES || component.format === "binary",
      contributors: component.contributors ?? [],
    };
  });

  const directories = new Set(components.map((component) => component.directory));
  const missingRequiredDirectories = [...REQUIRED_DIRECTORIES].filter((directory) => !directories.has(directory));
  const requiredComponentGaps = [];
  if (!components.some((component) => component.path === "metadata.json" && component.type === "metadata")) {
    requiredComponentGaps.push("metadata.json");
  }

  return {
    repositoryId: repository.id,
    baseVersion: repository.baseVersion,
    targetVersion: repository.targetVersion,
    componentCount: components.length,
    missingRequiredDirectories,
    requiredComponentGaps,
    components,
    manifestHash: hashValue(components),
  };
}

export function diffCsvComponent(component) {
  const before = component.before;
  const after = component.after;
  const keyField = component.keyField;
  const beforeRows = new Map(before.rows.map((row) => [row[keyField], row]));
  const afterRows = new Map(after.rows.map((row) => [row[keyField], row]));
  const beforeColumns = new Set(before.columns);
  const afterColumns = new Set(after.columns);

  const addedColumns = after.columns.filter((column) => !beforeColumns.has(column));
  const removedColumns = before.columns.filter((column) => !afterColumns.has(column));
  const addedRows = after.rows.filter((row) => !beforeRows.has(row[keyField]));
  const removedRows = before.rows.filter((row) => !afterRows.has(row[keyField]));
  const modifiedRows = [];

  for (const [key, beforeRow] of beforeRows) {
    const afterRow = afterRows.get(key);
    if (!afterRow) continue;

    const cells = [];
    for (const column of after.columns) {
      if (String(beforeRow[column] ?? "") !== String(afterRow[column] ?? "")) {
        cells.push({
          column,
          before: beforeRow[column] ?? null,
          after: afterRow[column] ?? null,
        });
      }
    }
    if (cells.length) {
      modifiedRows.push({ key, cells });
    }
  }

  return {
    componentId: component.id,
    path: component.path,
    format: "csv",
    keyField,
    addedColumns,
    removedColumns,
    addedRows,
    removedRows,
    modifiedRows,
    summary: {
      addedColumnCount: addedColumns.length,
      removedColumnCount: removedColumns.length,
      addedRowCount: addedRows.length,
      removedRowCount: removedRows.length,
      modifiedRowCount: modifiedRows.length,
    },
  };
}

export function diffJsonValues(before, after, path = "$") {
  if (stableStringify(before) === stableStringify(after)) return [];

  if (!isPlainObject(before) || !isPlainObject(after)) {
    return [{ path, change: "modified", before, after }];
  }

  const changes = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of [...keys].sort()) {
    const nextPath = `${path}.${key}`;
    if (!(key in before)) {
      changes.push({ path: nextPath, change: "added", before: null, after: after[key] });
    } else if (!(key in after)) {
      changes.push({ path: nextPath, change: "removed", before: before[key], after: null });
    } else {
      changes.push(...diffJsonValues(before[key], after[key], nextPath));
    }
  }
  return changes;
}

export function diffJsonComponent(component) {
  const changes = diffJsonValues(component.before, component.after);
  const citationSensitive = changes.filter((change) =>
    ["$.authors", "$.license", "$.schemaVersion", "$.schemaOrg", "$.tags"].some((prefix) => change.path.startsWith(prefix)),
  );

  return {
    componentId: component.id,
    path: component.path,
    format: "json",
    changes,
    citationSensitive,
    summary: {
      changeCount: changes.length,
      citationSensitiveCount: citationSensitive.length,
    },
  };
}

export function diffNotebookComponent(component) {
  const beforeCells = new Map(component.before.map((cell, index) => [cell.id, { ...cell, index }]));
  const afterCells = new Map(component.after.map((cell, index) => [cell.id, { ...cell, index }]));
  const addedCells = component.after.filter((cell) => !beforeCells.has(cell.id));
  const removedCells = component.before.filter((cell) => !afterCells.has(cell.id));
  const modifiedCells = [];
  const reorderedCells = [];

  for (const [cellId, beforeCell] of beforeCells) {
    const afterCell = afterCells.get(cellId);
    if (!afterCell) continue;

    const changes = [];
    if (beforeCell.cellType !== afterCell.cellType) changes.push("cell-type");
    if (beforeCell.source !== afterCell.source) changes.push("source");
    if (stableStringify(beforeCell.outputs) !== stableStringify(afterCell.outputs)) changes.push("outputs");
    if (beforeCell.executionCount !== afterCell.executionCount) changes.push("execution-count");
    if (changes.length) {
      modifiedCells.push({
        id: cellId,
        cellType: afterCell.cellType,
        changes,
        beforeSource: beforeCell.source,
        afterSource: afterCell.source,
      });
    }
    if (beforeCell.index !== afterCell.index) {
      reorderedCells.push({ id: cellId, beforeIndex: beforeCell.index, afterIndex: afterCell.index });
    }
  }

  const codeTouchCount =
    addedCells.filter((cell) => cell.cellType === "code").length +
    modifiedCells.filter((cell) => cell.cellType === "code" && cell.changes.includes("source")).length;

  return {
    componentId: component.id,
    path: component.path,
    format: "ipynb",
    addedCells,
    removedCells,
    modifiedCells,
    reorderedCells,
    summary: {
      addedCellCount: addedCells.length,
      removedCellCount: removedCells.length,
      modifiedCellCount: modifiedCells.length,
      reorderedCellCount: reorderedCells.length,
      codeTouchCount,
    },
  };
}

export function diffTextComponent(component) {
  const beforeLines = String(component.before ?? "").split("\n");
  const afterLines = String(component.after ?? "").split("\n");
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);

  return {
    componentId: component.id,
    path: component.path,
    format: component.format,
    addedLines: afterLines.filter((line) => !beforeSet.has(line)),
    removedLines: beforeLines.filter((line) => !afterSet.has(line)),
    summary: {
      addedLineCount: afterLines.filter((line) => !beforeSet.has(line)).length,
      removedLineCount: beforeLines.filter((line) => !afterSet.has(line)).length,
    },
  };
}

export function diffBinaryComponent(component) {
  return {
    componentId: component.id,
    path: component.path,
    format: component.format,
    beforeHash: component.beforeHash,
    afterHash: component.afterHash,
    summary: {
      binaryChanged: component.beforeHash !== component.afterHash,
    },
  };
}

export function compareRepositoryVersions(repository) {
  const manifest = buildComponentManifest(repository);
  const componentDiffs = repository.components.map((component) => diffComponent(component));

  return {
    repositoryId: repository.id,
    baseVersion: repository.baseVersion,
    targetVersion: repository.targetVersion,
    manifest,
    componentDiffs,
    diffHash: hashValue({ manifestHash: manifest.manifestHash, componentDiffs }),
  };
}

export function evaluateSemanticImpact(repository) {
  const comparison = compareRepositoryVersions(repository);
  const weights = [];

  for (const diff of comparison.componentDiffs) {
    if (diff.format === "csv") {
      weights.push(diff.summary.addedColumnCount * 12);
      weights.push(diff.summary.removedColumnCount * 14);
      weights.push(diff.summary.addedRowCount * 8);
      weights.push(diff.summary.removedRowCount * 10);
      weights.push(diff.summary.modifiedRowCount * 6);
    } else if (diff.format === "ipynb") {
      weights.push(diff.summary.codeTouchCount * 16);
      weights.push(diff.summary.reorderedCellCount * 3);
    } else if (diff.format === "json") {
      weights.push(diff.summary.citationSensitiveCount * 7);
    } else if (diff.summary?.binaryChanged) {
      weights.push(15);
    } else if (diff.summary?.addedLineCount || diff.summary?.removedLineCount) {
      weights.push(Math.min(12, diff.summary.addedLineCount + diff.summary.removedLineCount));
    }
  }

  const score = Math.min(100, weights.reduce((total, value) => total + value, 0));
  const level = score >= 70 ? "high" : score >= 35 ? "medium" : "low";
  const requiredActions = [];

  if (score >= 35) requiredActions.push("review-structured-diff");
  if (comparison.componentDiffs.some((diff) => diff.format === "csv" && diff.summary.addedColumnCount > 0)) {
    requiredActions.push("approve-schema-change");
  }
  if (comparison.componentDiffs.some((diff) => diff.format === "ipynb" && diff.summary.codeTouchCount > 0)) {
    requiredActions.push("rerun-notebook-pipeline");
  }
  if (comparison.componentDiffs.some((diff) => diff.format === "json" && diff.summary.citationSensitiveCount > 0)) {
    requiredActions.push("refresh-citation-metadata");
  }

  return {
    repositoryId: repository.id,
    level,
    score,
    requiredActions: [...new Set(requiredActions)],
    changedComponents: comparison.manifest.components.filter((component) => component.status === "changed").map((component) => component.path),
    impactHash: hashValue({ score, level, requiredActions }),
  };
}

export function buildReproducibilityPlan(repository) {
  const impact = evaluateSemanticImpact(repository);
  const manifest = buildComponentManifest(repository);
  const changedDataComponents = manifest.components.filter((component) => component.status === "changed" && component.type === "data");
  const blockers = [];
  const warnings = [];

  if (!repository.environment?.dockerfile && !repository.environment?.condaLock) {
    blockers.push("missing-reproducible-environment");
  }
  if (impact.requiredActions.includes("rerun-notebook-pipeline") && !repository.reproducibility?.requiredPipeline) {
    blockers.push("missing-notebook-pipeline");
  }
  if (changedDataComponents.length && !repository.reproducibility?.commands?.some((command) => command.includes("validate_schema"))) {
    warnings.push("data-changed-without-schema-validation-command");
  }
  if (repository.reproducibility?.lastRun?.version !== repository.targetVersion) {
    warnings.push("target-version-not-yet-reproduced");
  }

  return {
    repositoryId: repository.id,
    status: blockers.length ? "blocked" : warnings.length ? "needs-run" : "ready",
    sandboxProfile: repository.environment?.sandboxProfile ?? "unspecified",
    commands: repository.reproducibility?.commands ?? [],
    blockers,
    warnings,
    lastRun: repository.reproducibility?.lastRun ?? null,
    planHash: hashValue({ commands: repository.reproducibility?.commands ?? [], blockers, warnings }),
  };
}

export function buildRollbackPlan(repository) {
  const manifest = buildComponentManifest(repository);
  const changedComponents = manifest.components.filter((component) => component.status === "changed");
  const actions = changedComponents.map((component) => ({
    path: component.path,
    restoreHash: component.beforeHash,
    currentHash: component.afterHash,
    action: component.lfsCandidate ? "restore-lfs-pointer-or-binary-object" : "restore-versioned-content",
  }));

  if (changedComponents.some((component) => component.path === "metadata.json")) {
    actions.push({
      path: "metadata.json",
      action: "rebuild-citation-badge",
      restoreHash: hashValue(repository.citation),
      currentHash: hashValue({ ...repository.citation, version: repository.targetVersion }),
    });
  }

  return {
    repositoryId: repository.id,
    fromVersion: repository.targetVersion,
    toVersion: repository.baseVersion,
    safeToApply: actions.length > 0,
    actions,
    rollbackHash: hashValue(actions),
  };
}

export function buildCitationMetadata(repository) {
  const versionDoi = `${repository.citation.doi}.${repository.targetVersion.replaceAll(".", "-")}`;
  const apaAuthors = repository.citation.authors.join(", ");

  return {
    repositoryId: repository.id,
    doi: repository.citation.doi,
    versionDoi,
    version: repository.targetVersion,
    apa: `${apaAuthors} (${repository.citation.year}). ${repository.citation.title} (${repository.targetVersion}). SCIBASE. ${versionDoi}`,
    bibtex: `@dataset{${repository.id}_${repository.targetVersion.replaceAll(".", "_")},\n  title = {${repository.citation.title}},\n  author = {${repository.citation.authors.join(" and ")}},\n  year = {${repository.citation.year}},\n  doi = {${versionDoi}}\n}`,
    license: repository.citation.license,
  };
}

export function buildProvenanceSummary(repository) {
  const contributions = new Map();
  for (const component of repository.components) {
    for (const contributor of component.contributors ?? []) {
      if (!contributions.has(contributor)) {
        contributions.set(contributor, []);
      }
      contributions.get(contributor).push(component.path);
    }
  }

  return {
    mergeRequest: repository.mergeRequest,
    forkedFrom: repository.forkedFrom,
    contributors: [...contributions.entries()].map(([id, paths]) => ({ id, paths })),
    provenanceHash: hashValue({ mergeRequest: repository.mergeRequest, forkedFrom: repository.forkedFrom, contributions: [...contributions] }),
  };
}

export function buildReviewPacket(repository) {
  const comparison = compareRepositoryVersions(repository);
  const impact = evaluateSemanticImpact(repository);
  const reproducibility = buildReproducibilityPlan(repository);
  const rollback = buildRollbackPlan(repository);
  const citation = buildCitationMetadata(repository);
  const provenance = buildProvenanceSummary(repository);
  const decision = reproducibility.blockers.length
    ? "blocked"
    : impact.level === "high" || reproducibility.warnings.length
      ? "needs-reproducibility-review"
      : "review-ready";

  return {
    packetVersion: "structured-repository-diff-review/v0.1",
    repositoryId: repository.id,
    title: repository.title,
    decision,
    comparison,
    impact,
    reproducibility,
    rollback,
    citation,
    provenance,
    auditHash: hashValue({ comparisonHash: comparison.diffHash, impact, reproducibility, rollback, citation, provenance }),
  };
}

export function buildExportBundle(repository) {
  const packet = buildReviewPacket(repository);
  const bundle = {
    bundleName: `${repository.id}-${repository.targetVersion}-review-export`,
    includes: [
      "component-manifest.json",
      "structured-diff.json",
      "reproducibility-plan.json",
      "rollback-plan.json",
      "citation-metadata.json",
      "provenance-summary.json",
    ],
    restRoutes: [
      "/api/manifest",
      "/api/diff",
      "/api/review",
      "/api/rollback",
      "/api/export",
    ],
    cliCommands: [
      `scibase repo diff ${repository.id} --from ${repository.baseVersion} --to ${repository.targetVersion}`,
      `scibase repo rollback-plan ${repository.id} --to ${repository.baseVersion}`,
    ],
    packet,
  };

  return {
    ...bundle,
    exportHash: hashValue(bundle),
  };
}

function diffComponent(component) {
  if (component.format === "csv") return diffCsvComponent(component);
  if (component.format === "json") return diffJsonComponent(component);
  if (component.format === "ipynb") return diffNotebookComponent(component);
  if (component.format === "binary") return diffBinaryComponent(component);
  return diffTextComponent(component);
}

function editorFor(component) {
  if (component.format === "csv") return "table-diff-grid";
  if (component.format === "json") return "metadata-tree-diff";
  if (component.format === "ipynb") return "notebook-cell-diff";
  if (component.format === "markdown") return "markdown-inline-diff";
  if (component.format === "python") return "code-aware-diff";
  return STRUCTURED_FORMATS.has(component.format) ? "structured-diff" : "hash-compare";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
