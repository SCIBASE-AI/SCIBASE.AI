function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function uploadAction(type, target, reason) {
  return {type, target, reason};
}

function missingChunkIndexes(expectedChunks, chunkIndexes) {
  const received = new Set(chunkIndexes);
  const missing = [];
  for (let index = 0; index < expectedChunks; index += 1) {
    if (!received.has(index)) {
      missing.push(index);
    }
  }
  return missing;
}

function severityCounts(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {});
}

function evaluateUploadCheckpoint(input) {
  const artifact = input.artifact || {};
  const chunks = normalizeList(input.chunks);
  const expectedChunks = Number(artifact.expectedChunks || 0);
  const chunkIndexes = chunks.map((chunk) => chunk.index);
  const uniqueChunkIndexes = [...new Set(chunkIndexes)];
  const findings = [];
  const requiredActions = [];
  const missingChunks = missingChunkIndexes(expectedChunks, chunkIndexes);
  const receivedBytes = chunks.reduce((sum, chunk) => sum + Number(chunk.sizeBytes || 0), 0);

  if (missingChunks.length > 0) {
    findings.push({
      type: 'missing-upload-chunk',
      severity: 'critical',
      missingChunks,
      message: `Upload checkpoint is missing chunk indexes ${missingChunks.join(', ')}`,
    });
    requiredActions.push(uploadAction(
      'abort_incomplete_checkpoint',
      input.uploadId,
      'durable artifact commits require contiguous multipart coverage'
    ));
  }

  const duplicateChunks = uniqueChunkIndexes.filter((index) =>
    chunkIndexes.filter((chunkIndex) => chunkIndex === index).length > 1
  );
  if (duplicateChunks.length > 0) {
    findings.push({
      type: 'duplicate-upload-chunk',
      severity: 'major',
      duplicateChunks,
      message: `Upload checkpoint repeats chunk indexes ${duplicateChunks.join(', ')}`,
    });
    requiredActions.push(uploadAction(
      'deduplicate_checkpoint_chunks',
      input.uploadId,
      'resume state must have one authoritative checksum per chunk index'
    ));
  }

  for (const chunk of chunks) {
    if (chunk.declaredHash !== chunk.observedHash) {
      findings.push({
        type: 'chunk-checksum-mismatch',
        severity: 'major',
        chunk: chunk.index,
        declaredHash: chunk.declaredHash,
        observedHash: chunk.observedHash,
        message: `Chunk ${chunk.index} declares ${chunk.declaredHash} but observed ${chunk.observedHash}`,
      });
      requiredActions.push(uploadAction(
        'reupload_chunk',
        `${input.uploadId}:chunk-${chunk.index}`,
        'chunk checksum evidence must match before upload resume or artifact commit'
      ));
    }
  }

  if (artifact.expectedSizeBytes && receivedBytes !== artifact.expectedSizeBytes) {
    findings.push({
      type: 'upload-size-mismatch',
      severity: 'major',
      expectedSizeBytes: artifact.expectedSizeBytes,
      receivedBytes,
      message: `Received ${receivedBytes} bytes but artifact manifest expects ${artifact.expectedSizeBytes}`,
    });
    requiredActions.push(uploadAction(
      'reconcile_upload_size',
      input.uploadId,
      'chunk byte totals must match the artifact manifest'
    ));
  }

  if (!artifact.finalManifestHash) {
    findings.push({
      type: 'missing-final-manifest-hash',
      severity: 'metadata',
      message: 'Artifact lacks final manifest hash',
    });
    requiredActions.push(uploadAction(
      'record_final_manifest_hash',
      artifact.path || input.uploadId,
      'durable commits need a stable manifest hash for replay and DOI metadata'
    ));
  }

  if (!artifact.metadataSchema) {
    findings.push({
      type: 'missing-metadata-schema',
      severity: 'metadata',
      message: 'Artifact lacks DataCite/schema.org metadata schema evidence',
    });
    requiredActions.push(uploadAction(
      'attach_metadata_schema',
      artifact.path || input.uploadId,
      'hosted research artifacts need machine-readable metadata before commit'
    ));
  }

  if (input.generatedAt && input.expiresAt && Date.parse(input.generatedAt) > Date.parse(input.expiresAt)) {
    findings.push({
      type: 'stale-upload-checkpoint',
      severity: 'critical',
      expiresAt: input.expiresAt,
      message: `Upload checkpoint expired at ${input.expiresAt}`,
    });
    requiredActions.push(uploadAction(
      'restart_expired_upload',
      input.uploadId,
      'expired resume state cannot safely become a durable artifact'
    ));
  }

  const counts = severityCounts(findings);
  const criticalCount = counts.critical || 0;
  const majorCount = counts.major || 0;
  const metadataCount = counts.metadata || 0;
  const decision = criticalCount > 0
    ? 'abort-and-reupload'
    : majorCount > 0
      ? 'hold-resume'
      : metadataCount > 0
        ? 'hold-metadata'
        : 'commit-artifact';
  const integrityScore = Math.max(0, 100 - criticalCount * 40 - majorCount * 25 - metadataCount * 10);

  return {
    uploadId: input.uploadId,
    generatedAt: input.generatedAt,
    expiresAt: input.expiresAt,
    artifactPath: artifact.path,
    decision,
    integrityScore,
    findings,
    requiredActions,
    summary: {
      expectedChunks,
      receivedChunks: uniqueChunkIndexes.length,
      coverage: expectedChunks === 0 ? 1 : uniqueChunkIndexes.length / expectedChunks,
      expectedSizeBytes: artifact.expectedSizeBytes || 0,
      receivedBytes,
      severityCounts: counts,
    },
  };
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function buildCheckpointReport(result) {
  const lines = [
    '# Resumable Upload Checkpoint Guard Report',
    '',
    `Upload: ${result.uploadId}`,
    `Artifact: ${result.artifactPath}`,
    `Generated: ${result.generatedAt}`,
    `Expires: ${result.expiresAt}`,
    `Decision: ${result.decision}`,
    `Integrity score: ${result.integrityScore}`,
    '',
    '## Upload Coverage',
    '',
    `Chunks: ${result.summary.receivedChunks}/${result.summary.expectedChunks}`,
    `Coverage: ${percent(result.summary.coverage)}`,
    `Bytes: ${result.summary.receivedBytes}/${result.summary.expectedSizeBytes}`,
    `Findings: ${result.findings.length}`,
    '',
    '## Findings',
    '',
    ...(result.findings.length
      ? result.findings.map((finding) => `- ${finding.severity}: ${finding.type} - ${finding.message}`)
      : ['- None']),
    '',
    '## Required Actions',
    '',
    ...(result.requiredActions.length
      ? result.requiredActions.map((action) => `- ${action.type}: ${action.target} (${action.reason})`)
      : ['- None']),
    '',
  ];
  return lines.join('\n');
}

module.exports = {
  evaluateUploadCheckpoint,
  buildCheckpointReport,
};
