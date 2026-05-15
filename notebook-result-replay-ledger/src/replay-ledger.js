const crypto = require("node:crypto");

const REQUIRED_COMPONENT_KINDS = new Set([
  "data",
  "code",
  "notebook",
  "result",
  "environment",
  "protocol",
  "metadata"
]);

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function assertIsoDate(value, label, errors) {
  if (!value || Number.isNaN(Date.parse(value))) {
    errors.push(`${label} must be an ISO timestamp`);
  }
}

function buildComponentIndex(manifest) {
  return new Map((manifest.components || []).map((component) => [component.id, component]));
}

function requireComponent(index, id, label) {
  const component = index.get(id);
  if (!component) {
    throw new Error(`Missing ${label} component: ${id}`);
  }
  return component;
}

function componentReference(component, hashOverride) {
  return {
    id: component.id,
    kind: component.kind,
    path: component.path,
    hash: hashOverride || component.hash
  };
}

function createReplaySnapshot(manifest, cell, recordedHashes = {}) {
  const index = buildComponentIndex(manifest);
  const notebook = requireComponent(index, cell.notebookId, "notebook");
  const environment = requireComponent(index, cell.environmentComponentId, "environment");
  const inputComponents = cell.inputComponentIds.map((id) => requireComponent(index, id, "input"));
  const codeComponents = cell.codeComponentIds.map((id) => requireComponent(index, id, "code"));

  return {
    repositoryId: manifest.repository.id,
    releaseCandidate: manifest.repository.releaseCandidate,
    cellId: cell.id,
    cellLabel: cell.label,
    notebook: componentReference(notebook, recordedHashes[notebook.id]),
    inputs: inputComponents.map((component) => componentReference(component, recordedHashes[component.id])),
    code: codeComponents.map((component) => componentReference(component, recordedHashes[component.id])),
    environment: componentReference(environment, recordedHashes[environment.id])
  };
}

function listCellDependencyIds(cell) {
  return [
    cell.notebookId,
    ...cell.inputComponentIds,
    ...cell.codeComponentIds,
    cell.environmentComponentId
  ];
}

function changedAfterReplay(component, result) {
  if (!component.changedAt || !result.lastReplayedAt) {
    return false;
  }

  return Date.parse(component.changedAt) > Date.parse(result.lastReplayedAt);
}

function buildReplayFinding(manifest, cell, result) {
  const index = buildComponentIndex(manifest);
  const dependencyIds = listCellDependencyIds(cell);
  const currentSnapshot = createReplaySnapshot(manifest, cell);
  const recordedSnapshot = createReplaySnapshot(manifest, cell, result.recordedDependencyHashes || {});
  const currentDigest = digest(currentSnapshot);
  const recordedDigest = digest(recordedSnapshot);
  const staleDependencies = dependencyIds
    .map((id) => requireComponent(index, id, "dependency"))
    .filter((component) => {
      const recordedHash = result.recordedDependencyHashes?.[component.id];
      return recordedHash && recordedHash !== component.hash;
    })
    .map((component) => ({
      id: component.id,
      path: component.path,
      kind: component.kind,
      recordedHash: result.recordedDependencyHashes[component.id],
      currentHash: component.hash,
      changedAt: component.changedAt
    }));

  const lateChanges = dependencyIds
    .map((id) => requireComponent(index, id, "dependency"))
    .filter((component) => changedAfterReplay(component, result))
    .map((component) => ({
      id: component.id,
      path: component.path,
      kind: component.kind,
      changedAt: component.changedAt
    }));

  const problems = [];
  if (result.status === "failed") {
    problems.push({
      code: "failed-replay",
      message: result.failureReason || "Notebook replay did not complete."
    });
  }

  if (staleDependencies.length > 0) {
    problems.push({
      code: "stale-dependency-hash",
      message: "Recorded replay dependencies no longer match the repository manifest."
    });
  }

  if (lateChanges.length > 0) {
    problems.push({
      code: "dependency-changed-after-replay",
      message: "One or more dependencies changed after the result was last replayed."
    });
  }

  const severity = result.releaseCritical && problems.length > 0 ? "block-release" : "advisory";

  return {
    resultId: result.id,
    resultPath: result.path,
    cellId: cell.id,
    cellLabel: cell.label,
    releaseCritical: Boolean(result.releaseCritical),
    citationCritical: Boolean(result.citationCritical),
    lastReplayedAt: result.lastReplayedAt,
    resultHash: result.hash,
    currentReplayDigest: currentDigest,
    recordedReplayDigest: recordedDigest,
    staleDependencies,
    lateChanges,
    problems,
    severity
  };
}

function validateRepositoryManifest(manifest) {
  const errors = [];

  if (manifest.schemaVersion !== "replay-ledger.v1") {
    errors.push("schemaVersion must be replay-ledger.v1");
  }

  if (!manifest.repository?.id) {
    errors.push("repository.id is required");
  }

  if (!manifest.repository?.releaseCandidate) {
    errors.push("repository.releaseCandidate is required");
  }

  const seenIds = new Set();
  const kinds = new Set();
  for (const component of manifest.components || []) {
    if (!component.id) {
      errors.push("every component requires an id");
    }
    if (seenIds.has(component.id)) {
      errors.push(`duplicate component id: ${component.id}`);
    }
    seenIds.add(component.id);

    if (!component.kind || !REQUIRED_COMPONENT_KINDS.has(component.kind)) {
      errors.push(`component ${component.id || "<unknown>"} has unsupported kind`);
    } else {
      kinds.add(component.kind);
    }

    if (!component.path) {
      errors.push(`component ${component.id || "<unknown>"} requires a path`);
    }
    if (!component.hash?.startsWith("sha256:")) {
      errors.push(`component ${component.id || "<unknown>"} requires a sha256 hash`);
    }
    if (component.changedAt) {
      assertIsoDate(component.changedAt, `${component.id}.changedAt`, errors);
    }
    if (component.lastReplayedAt) {
      assertIsoDate(component.lastReplayedAt, `${component.id}.lastReplayedAt`, errors);
    }
  }

  for (const kind of REQUIRED_COMPONENT_KINDS) {
    if (!kinds.has(kind)) {
      errors.push(`repository manifest should include at least one ${kind} component`);
    }
  }

  const index = buildComponentIndex(manifest);
  for (const cell of manifest.notebookCells || []) {
    if (!cell.id) {
      errors.push("every notebook cell requires an id");
    }
    if (!index.has(cell.notebookId)) {
      errors.push(`cell ${cell.id} references missing notebook ${cell.notebookId}`);
    }
    if (!index.has(cell.environmentComponentId)) {
      errors.push(`cell ${cell.id} references missing environment ${cell.environmentComponentId}`);
    }
    for (const id of [...(cell.inputComponentIds || []), ...(cell.codeComponentIds || []), ...(cell.outputResultIds || [])]) {
      if (!index.has(id)) {
        errors.push(`cell ${cell.id} references missing component ${id}`);
      }
    }
  }

  return errors;
}

function buildRollbackPacket(manifest, finding) {
  const stalePaths = finding.staleDependencies.map((dependency) => dependency.path);
  const replayCommand = `scibase replay ${finding.cellId} --candidate ${manifest.repository.releaseCandidate}`;

  return {
    resultId: finding.resultId,
    resultPath: finding.resultPath,
    lastKnownGoodTag: manifest.repository.lastStableTag,
    rollbackTarget: `${manifest.repository.lastStableTag}:${finding.resultPath}`,
    replayCommand,
    dependencyPaths: stalePaths,
    reviewerNote:
      finding.severity === "block-release"
        ? "Hold the release until this notebook cell is replayed with the current manifest."
        : "Replay recommended before advertising this output as current."
  };
}

function buildCitationImpact(manifest, findings) {
  return findings
    .filter((finding) => finding.citationCritical && finding.problems.length > 0)
    .map((finding) => ({
      resultId: finding.resultId,
      badge: manifest.repository.citationBadge,
      releaseCandidate: manifest.repository.releaseCandidate,
      note: `${manifest.repository.releaseCandidate} should not show a clean citation badge until ${finding.resultPath} is replayed.`
    }));
}

function createReplayLedger(manifest) {
  const validationErrors = validateRepositoryManifest(manifest);
  if (validationErrors.length > 0) {
    return {
      valid: false,
      validationErrors,
      releaseDecision: "invalid-manifest",
      findings: [],
      rollbackPackets: [],
      citationImpacts: [],
      summary: {
        totalResults: 0,
        replayFindings: 0,
        releaseBlockingArtifacts: 0,
        citationImpacts: 0
      }
    };
  }

  const index = buildComponentIndex(manifest);
  const allFindings = [];
  for (const cell of manifest.notebookCells) {
    for (const resultId of cell.outputResultIds) {
      const result = requireComponent(index, resultId, "result");
      const finding = buildReplayFinding(manifest, cell, result);
      if (finding.problems.length > 0) {
        allFindings.push(finding);
      }
    }
  }

  const releaseBlockingFindings = allFindings.filter((finding) => finding.severity === "block-release");
  const releaseDecision = releaseBlockingFindings.length > 0 ? "block-release" : "ready";
  const rollbackPackets = allFindings.map((finding) => buildRollbackPacket(manifest, finding));
  const citationImpacts = buildCitationImpact(manifest, allFindings);
  const summary = {
    repositoryId: manifest.repository.id,
    releaseCandidate: manifest.repository.releaseCandidate,
    totalResults: manifest.components.filter((component) => component.kind === "result").length,
    replayFindings: allFindings.length,
    releaseBlockingArtifacts: releaseBlockingFindings.length,
    citationImpacts: citationImpacts.length
  };

  return {
    valid: true,
    validationErrors: [],
    releaseDecision,
    findings: allFindings,
    rollbackPackets,
    citationImpacts,
    summary,
    auditDigest: digest({
      summary,
      findings: allFindings.map((finding) => ({
        resultId: finding.resultId,
        severity: finding.severity,
        currentReplayDigest: finding.currentReplayDigest,
        recordedReplayDigest: finding.recordedReplayDigest
      }))
    })
  };
}

function formatLedgerReport(ledger) {
  if (!ledger.valid) {
    return [`Manifest invalid:`, ...ledger.validationErrors.map((error) => `- ${error}`)].join("\n");
  }

  const lines = [
    `Repository: ${ledger.summary.repositoryId}`,
    `Release candidate: ${ledger.summary.releaseCandidate}`,
    `Release decision: ${ledger.releaseDecision}`,
    `Replay findings: ${ledger.summary.replayFindings}`,
    `Release-blocking artifacts: ${ledger.summary.releaseBlockingArtifacts}`,
    `Citation impacts: ${ledger.summary.citationImpacts}`,
    `Audit digest: ${ledger.auditDigest}`,
    ""
  ];

  for (const finding of ledger.findings) {
    lines.push(`${finding.severity.toUpperCase()} ${finding.resultPath}`);
    lines.push(`  cell: ${finding.cellLabel}`);
    lines.push(`  current digest: ${finding.currentReplayDigest}`);
    lines.push(`  recorded digest: ${finding.recordedReplayDigest}`);
    for (const problem of finding.problems) {
      lines.push(`  - ${problem.code}: ${problem.message}`);
    }
  }

  return lines.join("\n");
}

module.exports = {
  createReplayLedger,
  createReplaySnapshot,
  digest,
  formatLedgerReport,
  stableStringify,
  validateRepositoryManifest
};
