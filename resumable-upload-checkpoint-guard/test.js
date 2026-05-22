const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateUploadCheckpoint,
  buildCheckpointReport,
} = require('./index');

test('blocks commit when upload chunks are not contiguous', () => {
  const result = evaluateUploadCheckpoint({
    uploadId: 'upload-climate-parquet',
    generatedAt: '2026-05-22T14:10:00Z',
    expiresAt: '2026-05-23T00:00:00Z',
    artifact: {
      path: 'datasets/climate-observations.parquet',
      expectedChunks: 4,
      expectedSizeBytes: 4096,
      finalManifestHash: 'sha256:manifest-ok',
      metadataSchema: 'DataCite-4.5',
    },
    chunks: [
      {index: 0, sizeBytes: 1024, declaredHash: 'sha256:c0', observedHash: 'sha256:c0'},
      {index: 1, sizeBytes: 1024, declaredHash: 'sha256:c1', observedHash: 'sha256:c1'},
      {index: 3, sizeBytes: 1024, declaredHash: 'sha256:c3', observedHash: 'sha256:c3'},
    ],
  });

  assert.equal(result.decision, 'abort-and-reupload');
  assert.equal(result.findings[0].type, 'missing-upload-chunk');
  assert.deepEqual(result.findings[0].missingChunks, [2]);
  assert.equal(result.summary.receivedChunks, 3);
});

test('holds resume when a chunk checksum does not match checkpoint evidence', () => {
  const result = evaluateUploadCheckpoint({
    uploadId: 'upload-notebook',
    generatedAt: '2026-05-22T14:10:00Z',
    expiresAt: '2026-05-23T00:00:00Z',
    artifact: {
      path: 'notebooks/reproduce.ipynb',
      expectedChunks: 2,
      expectedSizeBytes: 2048,
      finalManifestHash: 'sha256:manifest-ok',
      metadataSchema: 'schema.org/Dataset',
    },
    chunks: [
      {index: 0, sizeBytes: 1024, declaredHash: 'sha256:c0', observedHash: 'sha256:c0'},
      {index: 1, sizeBytes: 1024, declaredHash: 'sha256:declared', observedHash: 'sha256:observed'},
    ],
  });

  assert.equal(result.decision, 'hold-resume');
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].type, 'chunk-checksum-mismatch');
  assert.equal(result.requiredActions[0].type, 'reupload_chunk');
});

test('requires final manifest hash and metadata schema before durable artifact commit', () => {
  const result = evaluateUploadCheckpoint({
    uploadId: 'upload-rna-counts',
    generatedAt: '2026-05-22T14:10:00Z',
    expiresAt: '2026-05-23T00:00:00Z',
    artifact: {
      path: 'datasets/rna-counts.csv',
      expectedChunks: 1,
      expectedSizeBytes: 1000,
      finalManifestHash: '',
      metadataSchema: '',
    },
    chunks: [
      {index: 0, sizeBytes: 1000, declaredHash: 'sha256:c0', observedHash: 'sha256:c0'},
    ],
  });

  assert.equal(result.decision, 'hold-metadata');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['missing-final-manifest-hash', 'missing-metadata-schema']
  );
});

test('approves complete checkpoint and builds deterministic reviewer report', () => {
  const result = evaluateUploadCheckpoint({
    uploadId: 'upload-clean-supplement',
    generatedAt: '2026-05-22T14:10:00Z',
    expiresAt: '2026-05-23T00:00:00Z',
    artifact: {
      path: 'supplements/source-data.zip',
      expectedChunks: 3,
      expectedSizeBytes: 3072,
      finalManifestHash: 'sha256:manifest-clean',
      metadataSchema: 'DataCite-4.5',
    },
    chunks: [
      {index: 0, sizeBytes: 1024, declaredHash: 'sha256:a', observedHash: 'sha256:a'},
      {index: 1, sizeBytes: 1024, declaredHash: 'sha256:b', observedHash: 'sha256:b'},
      {index: 2, sizeBytes: 1024, declaredHash: 'sha256:c', observedHash: 'sha256:c'},
    ],
  });

  assert.equal(result.decision, 'commit-artifact');
  assert.equal(result.findings.length, 0);
  assert.equal(result.integrityScore, 100);
  assert.equal(result.summary.coverage, 1);

  const report = buildCheckpointReport(result);
  assert.match(report, /# Resumable Upload Checkpoint Guard Report/);
  assert.match(report, /Upload: upload-clean-supplement/);
  assert.match(report, /Decision: commit-artifact/);
  assert.match(report, /Integrity score: 100/);
  assert.match(report, /Findings: 0/);
});
