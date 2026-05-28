const crypto = require('crypto');

function assessNotebookOutputPacket(packet) {
  const cells = packet.cells || [];
  const orderFindings = assessExecutionOrder(cells);
  const assessedCells = cells.map((cell) => assessCell(cell, packet));
  const findings = [
    ...orderFindings,
    ...assessedCells.flatMap((item) => item.findings)
  ].sort(compareFindings);

  const status = chooseStatus(findings);
  const reviewPacket = {
    packetId: packet.packetId,
    workspaceId: packet.workspaceId,
    manuscriptId: packet.manuscriptId,
    status,
    acceptanceLanes: chooseAcceptanceLanes(status),
    assessedAt: packet.receivedAt,
    cells: assessedCells.map((item) => item.sanitizedCell),
    findings,
    actions: buildActions(packet, findings),
    reproducibilitySummary: buildSummary(cells, findings)
  };

  reviewPacket.auditDigest = digestPacket(reviewPacket);
  return reviewPacket;
}

function assessCell(cell, packet) {
  const findings = [];
  const sanitizedCell = sanitizeCellBase(cell);

  if (!cell.kernel || !cell.kernel.name || !cell.kernel.version) {
    findings.push(finding({
      code: 'MISSING_KERNEL_VERSION',
      severity: 'blocker',
      cellId: cell.id,
      message: 'Notebook output is missing the kernel name or version used to produce it.'
    }));
  } else if (!cell.kernel.runtimeDigest) {
    findings.push(finding({
      code: 'MISSING_RUNTIME_DIGEST',
      severity: 'warning',
      cellId: cell.id,
      message: 'Kernel version is present but the runtime digest was not captured.'
    }));
  }

  const expectedLock = expectedDependencyLock(packet, cell);
  if (expectedLock && cell.dependencyLock?.digest !== expectedLock.digest) {
    findings.push(finding({
      code: 'DEPENDENCY_LOCK_MISMATCH',
      severity: 'blocker',
      cellId: cell.id,
      message: `Notebook output was created with dependency lock ${cell.dependencyLock?.digest || 'missing'}, expected ${expectedLock.digest}.`
    }));
  }

  if (cell.stochastic && !cell.randomSeed) {
    findings.push(finding({
      code: 'MISSING_RANDOM_SEED',
      severity: 'blocker',
      cellId: cell.id,
      message: 'Stochastic notebook cell output cannot be accepted without a captured random seed.'
    }));
  }

  const missingInputs = (cell.inputs || []).filter((input) => !input.digest);
  if (missingInputs.length) {
    findings.push(finding({
      code: 'MISSING_INPUT_FINGERPRINT',
      severity: 'blocker',
      cellId: cell.id,
      message: `${missingInputs.length} notebook input artifact(s) lack a content fingerprint.`
    }));
  }

  if (isStaleOutput(cell, packet, expectedLock)) {
    findings.push(finding({
      code: 'STALE_NOTEBOOK_OUTPUT',
      severity: 'blocker',
      cellId: cell.id,
      message: 'Notebook output predates the current data, dependency, or manuscript section revision.'
    }));
  }

  if (hasUntrustedRichHtml(cell.outputs)) {
    findings.push(finding({
      code: 'UNTRUSTED_RICH_HTML_OUTPUT',
      severity: 'blocker',
      cellId: cell.id,
      message: 'Notebook rich output contains untrusted HTML or scriptable attributes.'
    }));
    sanitizedCell.outputs = sanitizeOutputs(cell.outputs || []);
  }

  if (containsPrivatePathInOutputs(cell.outputs)) {
    findings.push(finding({
      code: 'PRIVATE_OUTPUT_PATH',
      severity: 'blocker',
      cellId: cell.id,
      message: 'Notebook output references a local or private filesystem path.'
    }));
    sanitizedCell.outputs = sanitizeOutputs(sanitizedCell.outputs || cell.outputs || []);
  }

  const currentSectionVersion = packet.currentSectionVersions?.[cell.sectionId];
  if (currentSectionVersion && cell.sectionVersion !== currentSectionVersion) {
    findings.push(finding({
      code: 'SECTION_VERSION_MISMATCH',
      severity: 'blocker',
      cellId: cell.id,
      message: `Output targets section version ${cell.sectionVersion || 'missing'}, expected ${currentSectionVersion}.`
    }));
  }

  sanitizedCell.reviewState = findings.length ? 'reproducibility_review_required' : 'ready_for_collaborative_acceptance';
  return { sanitizedCell, findings };
}

function assessExecutionOrder(cells) {
  const findings = [];
  const byNotebook = new Map();

  for (const cell of cells) {
    const key = cell.notebookId || 'unknown-notebook';
    if (!byNotebook.has(key)) byNotebook.set(key, []);
    byNotebook.get(key).push(cell);
  }

  for (const [notebookId, notebookCells] of byNotebook.entries()) {
    const counts = new Map();
    for (const cell of notebookCells) {
      if (!Number.isInteger(cell.executionCount) || cell.executionCount <= 0) {
        findings.push(finding({
          code: 'INVALID_EXECUTION_COUNT',
          severity: 'blocker',
          cellId: cell.id,
          message: `Notebook ${notebookId} cell has no positive execution counter.`
        }));
        continue;
      }
      counts.set(cell.executionCount, (counts.get(cell.executionCount) || 0) + 1);
    }

    for (const cell of notebookCells) {
      if (counts.get(cell.executionCount) > 1) {
        findings.push(finding({
          code: 'DUPLICATE_EXECUTION_COUNT',
          severity: 'blocker',
          cellId: cell.id,
          message: `Execution count ${cell.executionCount} appears more than once in ${notebookId}.`
        }));
      }
    }

    const ordered = notebookCells
      .filter((cell) => Number.isInteger(cell.executionCount))
      .sort((a, b) => a.executionCount - b.executionCount);
    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index].executionCount !== ordered[index - 1].executionCount + 1) {
        findings.push(finding({
          code: 'EXECUTION_ORDER_GAP',
          severity: 'blocker',
          cellId: ordered[index].id,
          message: `Notebook ${notebookId} output sequence is not a clean rerun from a continuous kernel.`
        }));
        break;
      }
    }
  }

  return findings;
}

function sanitizeCellBase(cell) {
  const sanitized = clone(cell);
  sanitized.outputs = sanitizeOutputs(cell.outputs || []);
  return sanitized;
}

function sanitizeOutputs(outputs) {
  return outputs.map((output) => {
    const sanitized = { ...output };
    if (typeof sanitized.content === 'string') {
      sanitized.content = stripUnsafeHtml(redactPrivatePaths(sanitized.content));
    }
    if (sanitized.mime === 'text/html') {
      sanitized.trusted = false;
    }
    return sanitized;
  });
}

function hasUntrustedRichHtml(outputs = []) {
  return outputs.some((output) => (
    output.mime === 'text/html' &&
    (output.trusted !== true || /<script\b|onerror\s*=|onclick\s*=|javascript:/i.test(output.content || ''))
  ));
}

function containsPrivatePathInOutputs(outputs = []) {
  return outputs.some((output) => containsPrivatePath(output.content || ''));
}

function containsPrivatePath(value) {
  return /(?:file:\/\/|\/Users\/[^ \n<]+|\/home\/[^ \n<]+|private-lab|patient-export|restricted-dataset)/i.test(value);
}

function redactPrivatePaths(value) {
  return value
    .replace(/file:\/\/[^ \n<]+/gi, '[redacted-local-path]')
    .replace(/\/Users\/[^ \n<]+/g, '[redacted-local-path]')
    .replace(/\/home\/[^ \n<]+/g, '[redacted-local-path]')
    .replace(/private-lab\/[^\s<]+/gi, 'private-lab/[redacted]')
    .replace(/restricted-dataset\/[^\s<]+/gi, 'restricted-dataset/[redacted]');
}

function stripUnsafeHtml(value) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '[removed-script]')
    .replace(/\son(?:error|click|load)\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, 'blocked-javascript:');
}

function expectedDependencyLock(packet, cell) {
  const locks = packet.acceptedDependencyLocks || {};
  return locks[cell.notebookId] || locks[cell.kernel?.name] || null;
}

function isStaleOutput(cell, packet, expectedLock) {
  const executedAt = Date.parse(cell.lastExecutedAt);
  if (!executedAt) return true;

  const freshnessDates = [
    packet.currentDataRevisionAt,
    packet.currentNotebookRevisionAt,
    expectedLock?.updatedAt
  ].map((value) => Date.parse(value)).filter(Boolean);

  return freshnessDates.some((freshAt) => executedAt < freshAt);
}

function chooseStatus(findings) {
  if (findings.some((item) => item.severity === 'blocker')) return 'hold_notebook_outputs';
  if (findings.length) return 'stage_for_reproducibility_review';
  return 'accept_notebook_outputs';
}

function chooseAcceptanceLanes(status) {
  if (status === 'hold_notebook_outputs') {
    return {
      manuscriptInsertion: 'blocked',
      reviewerPreview: 'sanitized',
      auditRetention: 'reproducibility_hold'
    };
  }
  if (status === 'stage_for_reproducibility_review') {
    return {
      manuscriptInsertion: 'review_required',
      reviewerPreview: 'watermarked',
      auditRetention: 'standard'
    };
  }
  return {
    manuscriptInsertion: 'allowed',
    reviewerPreview: 'allowed',
    auditRetention: 'standard'
  };
}

function buildActions(packet, findings) {
  if (!findings.length) return [`accept_notebook_outputs:${packet.packetId}`];

  const actions = new Set();
  if (findings.some((item) => item.severity === 'blocker')) {
    actions.add(`hold_notebook_outputs:${packet.packetId}`);
    actions.add('rerun_notebook_from_clean_kernel');
  }
  for (const item of findings) {
    if (item.code === 'MISSING_RUNTIME_DIGEST') actions.add(`capture_runtime_digest:${item.cellId}`);
    if (item.code === 'DEPENDENCY_LOCK_MISMATCH') actions.add(`refresh_dependency_lock:${item.cellId}`);
    if (item.code === 'MISSING_RANDOM_SEED') actions.add(`record_random_seed:${item.cellId}`);
    if (item.code === 'MISSING_INPUT_FINGERPRINT') actions.add(`attach_input_fingerprints:${item.cellId}`);
    if (item.code === 'STALE_NOTEBOOK_OUTPUT') actions.add(`rerun_stale_cell:${item.cellId}`);
    if (item.code === 'UNTRUSTED_RICH_HTML_OUTPUT') actions.add(`sanitize_rich_output:${item.cellId}`);
    if (item.code === 'PRIVATE_OUTPUT_PATH') actions.add(`redact_private_output_paths:${item.cellId}`);
    if (item.code === 'SECTION_VERSION_MISMATCH') actions.add(`rebase_output_to_current_section:${item.cellId}`);
    if (item.code === 'EXECUTION_ORDER_GAP' || item.code === 'DUPLICATE_EXECUTION_COUNT') {
      actions.add('reset_kernel_and_run_all_cells');
    }
  }
  return Array.from(actions).sort();
}

function buildSummary(cells, findings) {
  const blockers = findings.filter((item) => item.severity === 'blocker').length;
  const warnings = findings.filter((item) => item.severity === 'warning').length;
  const notebooks = new Set(cells.map((cell) => cell.notebookId || 'unknown-notebook'));
  const trustedOutputs = cells.flatMap((cell) => cell.outputs || []).filter((output) => output.trusted === true).length;

  return {
    notebooks: notebooks.size,
    cells: cells.length,
    trustedOutputs,
    blockers,
    warnings
  };
}

function finding({ code, severity, cellId, message }) {
  return { code, severity, cellId, message };
}

function compareFindings(a, b) {
  const severityRank = { blocker: 0, warning: 1, info: 2 };
  return (
    severityRank[a.severity] - severityRank[b.severity] ||
    String(a.cellId || '').localeCompare(String(b.cellId || '')) ||
    a.code.localeCompare(b.code)
  );
}

function digestPacket(packet) {
  return digestValue(stableStringify(packet));
}

function digestValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  assessNotebookOutputPacket,
  sanitizeOutputs,
  redactPrivatePaths,
  stripUnsafeHtml
};
