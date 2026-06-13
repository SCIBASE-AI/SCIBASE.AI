const crypto = require('crypto');

function assessImportBatch(batch) {
  if (!isImportBatchObject(batch)) {
    return malformedImportBatchPacket();
  }

  const blocks = blockListFor(batch);
  const batchFindings = assessBatchShape(batch);
  const existingAnchorFindings = assessExistingAnchorShape(batch);
  const blockShapeFindings = assessBlockShapes(blocks);
  const sourceFindings = assessSource(batch);
  const validBlocks = blocks.filter(isImportBlockObject);
  const duplicateAnchorBlocks = findAnchorCollisionBlocks(validBlocks, existingAnchorListFor(batch));
  const sanitizedBlocks = [];
  const blockFindings = [];

  for (const [blockIndex, block] of validBlocks.entries()) {
    const { sanitizedBlock, findings } = assessBlock(block, batch, duplicateAnchorBlocks, blockIndex);
    sanitizedBlocks.push(sanitizedBlock);
    blockFindings.push(...findings);
  }

  const findings = [
    ...batchFindings,
    ...existingAnchorFindings,
    ...blockShapeFindings,
    ...sourceFindings,
    ...blockFindings
  ].sort(compareFindings);
  const status = chooseStatus(findings);
  const outputBatch = sanitizeBatchMetadata(batch);
  const packet = {
    importId: outputBatch.importId,
    workspaceId: outputBatch.workspaceId,
    status,
    insertionLanes: chooseInsertionLanes(status),
    source: sanitizeSource(outputBatch.source || {}),
    findings,
    sanitizedBlocks,
    actions: buildActions(outputBatch, findings),
    assessedAt: batch.receivedAt
  };

  packet.auditDigest = digestPacket(packet);
  return packet;
}

function isImportBatchObject(batch) {
  return Boolean(batch && typeof batch === 'object' && !Array.isArray(batch));
}

function malformedImportBatchPacket() {
  const batch = {
    importId: 'unknown-import',
    workspaceId: null,
    receivedAt: null,
    source: {}
  };
  const findings = [
    finding({
      code: 'MALFORMED_IMPORT_BATCH',
      severity: 'warning',
      blockId: null,
      message: 'Import payload is malformed and cannot enter collaborative state directly.'
    })
  ];
  const packet = {
    importId: batch.importId,
    workspaceId: batch.workspaceId,
    status: 'stage_for_curator_review',
    insertionLanes: chooseInsertionLanes('stage_for_curator_review'),
    source: sanitizeSource(batch.source),
    findings,
    sanitizedBlocks: [],
    actions: buildActions(batch, findings),
    assessedAt: batch.receivedAt
  };

  packet.auditDigest = digestPacket(packet);
  return packet;
}

function blockListFor(batch) {
  return Array.isArray(batch.blocks) ? batch.blocks : [];
}

function existingAnchorListFor(batch) {
  return Array.isArray(batch.existingAnchors) ? batch.existingAnchors : [];
}

function isImportBlockObject(block) {
  return Boolean(block && typeof block === 'object' && !Array.isArray(block));
}

function assessBatchShape(batch) {
  if (Array.isArray(batch.blocks)) {
    return [];
  }

  return [
    finding({
      code: 'MALFORMED_IMPORT_BLOCKS',
      severity: 'warning',
      blockId: null,
      message: 'Import payload is missing a valid block list for collaborative insertion.'
    })
  ];
}

function assessExistingAnchorShape(batch) {
  if (batch.existingAnchors === undefined || Array.isArray(batch.existingAnchors)) {
    return [];
  }

  return [
    finding({
      code: 'MALFORMED_EXISTING_ANCHORS',
      severity: 'warning',
      blockId: null,
      message: 'Existing shared-document anchors are malformed, so imported anchors need curator review before insertion.'
    })
  ];
}

function assessBlockShapes(blocks) {
  return blocks
    .filter((block) => !isImportBlockObject(block))
    .map(() => finding({
      code: 'MALFORMED_IMPORT_BLOCK',
      severity: 'warning',
      blockId: null,
      message: 'Import payload contains a malformed block entry that cannot enter collaborative state.'
    }));
}

function assessSource(batch) {
  const source = batch.source || {};
  const originLabel = sourceOriginLabel(source.origin);
  const findings = [];

  if (!isRecognizedImportChannel(source.channel)) {
    findings.push(finding({
      code: 'UNKNOWN_IMPORT_CHANNEL',
      severity: 'warning',
      blockId: null,
      message: `Import channel ${source.channel || 'unknown'} is not recognized for direct collaborative insertion.`
    }));
  }

  if (source.trustLevel === 'untrusted') {
    findings.push(finding({
      code: 'UNTRUSTED_SOURCE',
      severity: 'blocker',
      blockId: null,
      message: `Import source ${originLabel} is not trusted for collaborative insertion.`
    }));
  }

  if (!['trusted', 'partner', 'untrusted'].includes(source.trustLevel)) {
    findings.push(finding({
      code: 'UNKNOWN_SOURCE_TRUST',
      severity: 'warning',
      blockId: null,
      message: `Import source ${originLabel} is missing recognized trust metadata.`
    }));
  }

  if (['trusted', 'partner'].includes(source.trustLevel) && !hasSignedAttestation(source)) {
    findings.push(finding({
      code: 'MISSING_SOURCE_ATTESTATION',
      severity: 'warning',
      blockId: null,
      message: `${formatTrustLevel(source.trustLevel)} import needs a signed source attestation before direct insertion.`
    }));
  }

  if (hasSignedAttestation(source) && !hasValidSignedAttestation(source)) {
    findings.push(finding({
      code: 'INVALID_SOURCE_ATTESTATION',
      severity: 'warning',
      blockId: null,
      message: `${formatTrustLevel(source.trustLevel)} import has a placeholder or malformed source attestation.`
    }));
  }

  if (containsLocalPrivatePath(source.origin)) {
    findings.push(finding({
      code: 'LOCAL_PRIVATE_SOURCE',
      severity: 'blocker',
      blockId: null,
      message: 'Import source origin references a local or private filesystem path.'
    }));
  }

  return findings;
}

function assessBlock(block, batch, duplicateAnchorBlocks, blockIndex) {
  const findings = [];
  const sanitizedBlock = sanitizeBlockBase(block, duplicateAnchorBlocks, blockIndex);

  if (containsHiddenInstruction(block.hiddenText)) {
    findings.push(finding({
      code: 'HIDDEN_INSTRUCTION_TEXT',
      severity: 'blocker',
      blockId: block.id,
      message: 'Hidden clipboard text contains instruction-like content that reviewers cannot see.'
    }));
  }

  if (hasFormulaCell(block)) {
    findings.push(finding({
      code: 'CSV_FORMULA_CELL',
      severity: 'blocker',
      blockId: block.id,
      message: 'Imported table contains spreadsheet formulas that must be escaped before render.'
    }));
    sanitizedBlock.cells = sanitizeCells(block.cells);
  }

  if (hasMalformedTableCells(block)) {
    findings.push(finding({
      code: 'MALFORMED_TABLE_CELLS',
      severity: 'warning',
      blockId: block.id,
      message: 'Imported table contains malformed cell metadata that cannot enter collaborative state directly.'
    }));
    sanitizedBlock.cells = [];
  }

  if (hasMalformedTableRows(block)) {
    findings.push(finding({
      code: 'MALFORMED_TABLE_ROW',
      severity: 'warning',
      blockId: block.id,
      message: 'Imported table contains a malformed row that cannot enter collaborative state directly.'
    }));
    sanitizedBlock.cells = sanitizeCells(block.cells);
  }

  if (containsLocalPrivatePath(block.content) || hasLocalPrivatePathCell(block)) {
    findings.push(finding({
      code: 'LOCAL_PRIVATE_PATH',
      severity: 'blocker',
      blockId: block.id,
      message: 'Imported notebook output references a local or private filesystem path.'
    }));
    if (typeof block.content === 'string') {
      sanitizedBlock.content = redactLocalPrivatePaths(block.content);
    }
    if (Array.isArray(block.cells)) {
      sanitizedBlock.cells = sanitizeCells(block.cells);
    }
  }

  if (isStaleReviewMetadata(block, batch)) {
    findings.push(finding({
      code: 'STALE_REVIEW_METADATA',
      severity: 'blocker',
      blockId: block.id,
      message: 'Imported review metadata is expired or bound to an old section version.'
    }));
    delete sanitizedBlock.reviewMetadata;
    sanitizedBlock.reviewMetadataStatus = 'dropped_stale';
  }

  if (duplicateAnchorBlocks.has(blockIdentity(block, blockIndex))) {
    findings.push(finding({
      code: 'DUPLICATE_ANCHOR',
      severity: 'blocker',
      blockId: blockReference(block, blockIndex),
      message: `Anchor ${block.anchor} appears more than once in the imported payload.`
    }));
  }

  return { sanitizedBlock, findings };
}

function sanitizeBlockBase(block, duplicateAnchorBlocks, blockIndex) {
  const sanitized = {};
  for (const [key, value] of Object.entries(block)) {
    if (key !== 'hiddenText') {
      sanitized[key] = clone(value);
    }
  }

  if (sanitized.anchor && duplicateAnchorBlocks.has(blockIdentity(block, blockIndex))) {
    sanitized.anchor = `${sanitized.anchor}-${digestValue(blockIdentity(block, blockIndex)).slice(0, 8)}`;
  }

  return sanitized;
}

function findAnchorCollisionBlocks(blocks, existingAnchors = []) {
  const blocksByAnchor = new Map();
  const duplicates = new Set();
  const existingAnchorSet = new Set(existingAnchors.filter(Boolean));

  for (const [blockIndex, block] of blocks.entries()) {
    if (!block.anchor) continue;
    if (existingAnchorSet.has(block.anchor)) {
      duplicates.add(blockIdentity(block, blockIndex));
    }
    const anchorBlocks = blocksByAnchor.get(block.anchor) || [];
    anchorBlocks.push({ block, blockIndex });
    blocksByAnchor.set(block.anchor, anchorBlocks);
  }

  for (const anchorBlocks of blocksByAnchor.values()) {
    if (anchorBlocks.length > 1) {
      anchorBlocks.forEach(({ block, blockIndex }) => duplicates.add(blockIdentity(block, blockIndex)));
    }
  }

  return duplicates;
}

function blockIdentity(block, blockIndex) {
  return block.id || `missing-id:${blockIndex}:${block.anchor || 'unanchored'}`;
}

function blockReference(block, blockIndex) {
  return block.id || `unidentified-block-${blockIndex + 1}`;
}

function hasFormulaCell(block) {
  return Array.isArray(block.cells) && block.cells.some((row) => (
    Array.isArray(row) && row.some((cell) => typeof cell === 'string' && /^[=+\-@]/.test(cell.trim()))
  ));
}

function hasMalformedTableCells(block) {
  return block.type === 'table' && Object.hasOwn(block, 'cells') && !Array.isArray(block.cells);
}

function hasLocalPrivatePathCell(block) {
  return Array.isArray(block.cells) && block.cells.some((row) => (
    Array.isArray(row) && row.some((cell) => typeof cell === 'string' && containsLocalPrivatePath(cell))
  ));
}

function hasMalformedTableRows(block) {
  return Array.isArray(block.cells) && block.cells.some((row) => !Array.isArray(row));
}

function sanitizeCells(cells) {
  return cells.map((row) => {
    if (!Array.isArray(row)) {
      return [];
    }

    return row.map((cell) => {
      if (typeof cell === 'string') {
        const redacted = containsLocalPrivatePath(cell) ? redactLocalPrivatePaths(cell) : cell;
        if (/^[=+\-@]/.test(redacted.trim())) {
          return `'${redacted}`;
        }
        return redacted;
      }
      return cell;
    });
  });
}

function sanitizeBatchMetadata(batch) {
  return {
    ...batch,
    importId: sanitizeImportId(batch.importId),
    workspaceId: sanitizeWorkspaceId(batch.workspaceId),
    source: sanitizeBatchSource(batch.source || {})
  };
}

function sanitizeImportId(value) {
  if (!value) return 'unknown-import';
  return containsPrivateMetadata(value) ? 'import-redacted' : value;
}

function sanitizeWorkspaceId(value) {
  if (value === undefined || value === null) return null;
  return containsPrivateMetadata(value) ? redactPrivateMetadata(value) : value;
}

function sanitizeBatchSource(source) {
  return {
    ...source,
    origin: sourceOriginLabel(source.origin)
  };
}

function containsPrivateMetadata(value = '') {
  return containsLocalPrivatePath(value) || containsDirectIdentifier(value);
}

function containsDirectIdentifier(value = '') {
  return /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|orcid:\d{4}-\d{4}-\d{4}-\d{3}[\dx]/i.test(value);
}

function redactPrivateMetadata(value = '') {
  if (typeof value !== 'string') return value;
  return redactLocalPrivatePaths(value)
    .replace(/\bmailto:[^ \s"')]+/gi, '[redacted-private-reference]')
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[redacted-private-reference]')
    .replace(/\borcid:\d{4}-\d{4}-\d{4}-\d{3}[\dx]\b/gi, '[redacted-private-reference]');
}

function containsHiddenInstruction(value = '') {
  return /ignore previous|system prompt|hidden instruction|do not show|approve the submission/i.test(value);
}

function containsLocalPrivatePath(value = '') {
  return /(?:file:\/\/|[A-Z]:[\\/]Users[\\/][^ \s"')]+|\/Users\/[^ \s"')]+|\/home\/[^ \s"')]+|private-lab|patient-export)/i.test(value);
}

function redactLocalPrivatePaths(value = '') {
  return value
    .replace(/file:\/\/[^ \s"')]+/gi, '[redacted-local-path]')
    .replace(/[A-Z]:[\\/]Users[\\/][^ \s"')]+/gi, '[redacted-local-path]')
    .replace(/\/Users\/[^ \s"')]+/g, '[redacted-local-path]')
    .replace(/\/home\/[^ \s"')]+/g, '[redacted-local-path]')
    .replace(/\b(?:private-lab|patient-export)\b/gi, '[redacted-private-reference]');
}

function isStaleReviewMetadata(block, batch) {
  const metadata = block.reviewMetadata;
  if (!metadata) return false;

  const receivedAt = Date.parse(batch.receivedAt);
  const expiresAt = metadata.expiresAt ? Date.parse(metadata.expiresAt) : null;
  if (metadata.expiresAt && (!Number.isFinite(expiresAt) || !Number.isFinite(receivedAt))) return true;
  if (Number.isFinite(expiresAt) && Number.isFinite(receivedAt) && expiresAt < receivedAt) return true;

  const currentVersion = batch.currentSectionVersions?.[block.sectionId];
  return Boolean(currentVersion && metadata.sectionVersion && metadata.sectionVersion !== currentVersion);
}

function chooseStatus(findings) {
  if (findings.some((item) => item.severity === 'blocker')) return 'quarantine_import';
  if (findings.length) return 'stage_for_curator_review';
  return 'allow_collaborative_insert';
}

function chooseInsertionLanes(status) {
  if (status === 'quarantine_import') {
    return {
      collaborativeInsert: 'blocked',
      reviewerPreview: 'redacted',
      auditRetention: 'quarantine'
    };
  }
  if (status === 'stage_for_curator_review') {
    return {
      collaborativeInsert: 'curator_review',
      reviewerPreview: 'watermarked',
      auditRetention: 'staged'
    };
  }
  return {
    collaborativeInsert: 'allowed',
    reviewerPreview: 'allowed',
    auditRetention: 'standard'
  };
}

function buildActions(batch, findings) {
  if (!findings.length) return [`allow_collaborative_insert:${batch.importId}`];

  const actions = new Set();
  if (findings.some((item) => item.severity === 'blocker')) {
    actions.add(`quarantine_import:${batch.importId}`);
  }

  for (const item of findings) {
    if (item.code === 'CSV_FORMULA_CELL') actions.add(`escape_formula_cells:${item.blockId}`);
    if (item.code === 'LOCAL_PRIVATE_PATH') actions.add(`redact_local_paths:${item.blockId}`);
    if (item.code === 'STALE_REVIEW_METADATA') actions.add(`drop_stale_review_metadata:${item.blockId}`);
    if (item.code === 'DUPLICATE_ANCHOR') actions.add(`regenerate_anchor:${item.blockId}`);
    if (item.code === 'HIDDEN_INSTRUCTION_TEXT') actions.add(`strip_hidden_instruction_text:${item.blockId}`);
    if (item.code === 'LOCAL_PRIVATE_SOURCE') actions.add(`redact_source_origin:${batch.importId}`);
    if (item.code === 'UNTRUSTED_SOURCE') actions.add(`require_curator_source_review:${batch.importId}`);
    if (item.code === 'UNKNOWN_SOURCE_TRUST') actions.add(`require_curator_source_review:${batch.importId}`);
    if (item.code === 'UNKNOWN_IMPORT_CHANNEL') actions.add(`require_curator_channel_review:${batch.importId}`);
    if (item.code === 'MALFORMED_IMPORT_BATCH') actions.add(`require_curator_payload_review:${batch.importId}`);
    if (item.code === 'MALFORMED_EXISTING_ANCHORS') actions.add(`require_curator_anchor_review:${batch.importId}`);
    if (item.code === 'MALFORMED_IMPORT_BLOCKS') actions.add(`require_curator_payload_review:${batch.importId}`);
    if (item.code === 'MALFORMED_IMPORT_BLOCK') actions.add(`require_curator_payload_review:${batch.importId}`);
    if (item.code === 'MALFORMED_TABLE_CELLS') actions.add(`require_curator_payload_review:${batch.importId}`);
    if (item.code === 'MALFORMED_TABLE_ROW') actions.add(`require_curator_payload_review:${batch.importId}`);
    if (item.code === 'MISSING_SOURCE_ATTESTATION') actions.add(`request_signed_source_attestation:${batch.importId}`);
    if (item.code === 'INVALID_SOURCE_ATTESTATION') actions.add(`request_signed_source_attestation:${batch.importId}`);
  }

  return [...actions].sort();
}

function finding({ code, severity, blockId, message }) {
  return { code, severity, blockId, message };
}

function compareFindings(left, right) {
  return `${left.code}:${left.blockId || ''}`.localeCompare(`${right.code}:${right.blockId || ''}`);
}

function sanitizeSource(source) {
  const origin = source.origin || 'unknown';
  return {
    channel: source.channel || 'unknown',
    origin: sourceOriginLabel(origin),
    trustLevel: source.trustLevel || 'unknown',
    attested: hasValidSignedAttestation(source)
  };
}

function sourceOriginLabel(origin) {
  const value = origin || 'unknown';
  return containsPrivateMetadata(value) ? redactPrivateMetadata(value) : value;
}

function isRecognizedImportChannel(channel) {
  return ['clipboard', 'file-import'].includes(channel);
}

function hasSignedAttestation(source) {
  return typeof source.signedAttestation === 'string' && source.signedAttestation.trim().length > 0;
}

function hasValidSignedAttestation(source) {
  return hasSignedAttestation(source) && /^sha256:[a-f0-9]{64}$/i.test(source.signedAttestation.trim());
}

function formatTrustLevel(trustLevel) {
  return String(trustLevel || 'source')
    .replace(/[-_]+/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }
  return value;
}

function digestValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function digestPacket(packet) {
  return crypto.createHash('sha256').update(stableStringify(packet)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  assessImportBatch
};
