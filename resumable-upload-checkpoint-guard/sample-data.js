const scenarios = [
  {
    name: 'missing-chunk-abort',
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
  },
  {
    name: 'checksum-hold',
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
  },
  {
    name: 'metadata-hold',
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
  },
  {
    name: 'clean-upload',
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
  },
];

module.exports = {scenarios};
