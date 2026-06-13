const riskyRepository = {
  repositoryId: 'repo-reference-risk',
  assessedAt: '2026-05-28T12:00:00Z',
  policy: {
    maxReferenceAgeDays: 180
  },
  references: [
    {
      id: 'submodule-analysis-tools',
      kind: 'git_submodule',
      target: 'https://github.com/example/analysis-tools',
      branch: 'main',
      commitSha: '',
      license: 'MIT',
      attribution: 'Example Analysis Tools',
      lastVerifiedAt: '2026-05-20T08:00:00Z'
    },
    {
      id: 'dataset-lab-export',
      kind: 'linked_dataset',
      target: 'https://data.example.invalid/lab-export.csv',
      checksum: 'pending',
      doi: 'pending',
      license: 'CC-BY-4.0',
      attribution: 'Example Lab',
      lastVerifiedAt: '2025-01-15T08:00:00Z'
    },
    {
      id: 'api-weather-source',
      kind: 'api_source',
      target: 'https://api.example.invalid/weather/latest',
      snapshotDate: '',
      checksum: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      authRequired: true,
      license: 'CC0-1.0',
      attribution: 'Example Weather API',
      lastVerifiedAt: '2026-05-20T08:00:00Z'
    }
  ]
};

const cleanRepository = {
  repositoryId: 'repo-reference-clean',
  assessedAt: '2026-05-28T12:00:00Z',
  references: [
    {
      id: 'submodule-analysis-tools',
      kind: 'git_submodule',
      target: 'https://github.com/example/analysis-tools',
      commitSha: '7f9c2d6c8e0f4b1a2d3c5e6f708192a3b4c5d6e7',
      license: 'MIT',
      attribution: 'Example Analysis Tools',
      lastVerifiedAt: '2026-05-20T08:00:00Z'
    },
    {
      id: 'dataset-lab-export',
      kind: 'linked_dataset',
      target: 'https://doi.org/10.5281/zenodo.1234567',
      checksum: 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      doi: '10.5281/zenodo.1234567',
      license: 'CC-BY-4.0',
      attribution: 'Example Lab',
      lastVerifiedAt: '2026-05-20T08:00:00Z'
    },
    {
      id: 'api-weather-source',
      kind: 'api_source',
      target: 'https://api.example.invalid/weather/snapshots/2026-05-01.json',
      snapshotDate: '2026-05-01',
      checksum: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      authRequired: false,
      license: 'CC0-1.0',
      attribution: 'Example Weather API',
      lastVerifiedAt: '2026-05-20T08:00:00Z'
    }
  ]
};

const warningRepository = {
  repositoryId: 'repo-reference-warning',
  assessedAt: '2026-05-28T12:00:00Z',
  references: [
    {
      id: 'model-weights',
      kind: 'model_weights',
      target: 'https://models.example.invalid/model-v3.bin',
      checksum: 'sha256:feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface',
      version: 'v3.0.1',
      license: '',
      attribution: '',
      lastVerifiedAt: '2026-05-20T08:00:00Z'
    }
  ]
};

const malformedRepository = {
  repositoryId: 'repo-reference-malformed-entry',
  assessedAt: '2026-05-28T12:00:00Z',
  references: [null]
};

const malformedManifestRepository = {
  repositoryId: 'repo-reference-malformed-manifest',
  assessedAt: '2026-05-28T12:00:00Z',
  references: {
    dataset: {
      id: 'dataset-not-in-list',
      kind: 'linked_dataset',
      target: 'https://doi.org/10.5281/zenodo.4567890'
    }
  }
};

const missingIdentityRepository = {
  repositoryId: 'repo-reference-missing-identity',
  assessedAt: '2026-05-28T12:00:00Z',
  references: [
    {
      id: '',
      kind: 'linked_dataset',
      target: 'https://doi.org/10.5281/zenodo.5678901',
      checksum: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      doi: '10.5281/zenodo.5678901',
      license: 'CC-BY-4.0',
      attribution: 'Example Lab',
      lastVerifiedAt: '2026-05-20T08:00:00Z'
    }
  ]
};

const malformedRepositoryPacket = null;

const missingAssessmentTimestampRepository = {
  repositoryId: 'repo-reference-missing-assessed-at',
  references: [
    {
      id: 'dataset-with-current-evidence',
      kind: 'linked_dataset',
      target: 'https://doi.org/10.5281/zenodo.6789012',
      checksum: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      doi: '10.5281/zenodo.6789012',
      license: 'CC-BY-4.0',
      attribution: 'Example Lab',
      lastVerifiedAt: '2026-05-20T08:00:00Z'
    }
  ]
};

module.exports = {
  riskyRepository,
  cleanRepository,
  warningRepository,
  malformedRepository,
  malformedManifestRepository,
  missingIdentityRepository,
  malformedRepositoryPacket,
  missingAssessmentTimestampRepository
};
