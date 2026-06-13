const assert = require('assert');

const { assessExternalReferences } = require('./index');

function findingCodes(packet) {
  return packet.findings.map((finding) => finding.code).sort();
}

function testBlocksFloatingAndNonExportableExternalReferences() {
  const packet = assessExternalReferences({
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
        attribution: 'Example Analysis Tools'
      },
      {
        id: 'dataset-lab-export',
        kind: 'linked_dataset',
        target: 'https://data.example.invalid/lab-export.csv',
        checksum: '',
        doi: '',
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
        attribution: 'Example Weather API'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.equal(packet.releaseLanes.doiPublication, 'blocked');
  assert.equal(packet.releaseLanes.exportBundle, 'blocked');
  assert.deepEqual(findingCodes(packet), [
    'AUTH_REQUIRED_REFERENCE',
    'FLOATING_API_REFERENCE',
    'FLOATING_GIT_REFERENCE',
    'MISSING_DURABLE_IDENTIFIER',
    'STALE_REFERENCE_EVIDENCE'
  ]);
  assert.ok(packet.actions.includes('pin_external_reference:submodule-analysis-tools'));
  assert.ok(packet.actions.includes('add_checksum_or_doi:dataset-lab-export'));
  assert.ok(packet.actions.includes('replace_or_snapshot_auth_reference:api-weather-source'));
  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
}

function testAllowsPinnedExportableReferences() {
  const packet = assessExternalReferences({
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
  });

  assert.equal(packet.status, 'release_repository_references');
  assert.equal(packet.releaseLanes.doiPublication, 'allowed');
  assert.equal(packet.releaseLanes.exportBundle, 'allowed');
  assert.deepEqual(packet.findings, []);
  assert.deepEqual(packet.actions, ['release_with_reference_pin_monitoring:repo-reference-clean']);
  assert.equal(packet.referenceSignals.immutablePins, true);
  assert.equal(packet.referenceSignals.exportable, true);
}

function testStagesReferencesMissingLicenseAttributionOnly() {
  const packet = assessExternalReferences({
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
  });

  assert.equal(packet.status, 'stage_reference_metadata_revision');
  assert.equal(packet.releaseLanes.doiPublication, 'metadata_revision');
  assert.equal(packet.releaseLanes.exportBundle, 'draft_only');
  assert.deepEqual(findingCodes(packet), [
    'MISSING_ATTRIBUTION',
    'MISSING_LICENSE'
  ]);
  assert.deepEqual(packet.actions, ['complete_license_attribution:model-weights']);
}

function testFloatingVersionAliasDoesNotCountAsDurableIdentifier() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-floating-version',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'model-weights-latest',
        kind: 'model_weights',
        target: 'https://models.example.invalid/model.bin',
        version: 'latest',
        checksum: '',
        doi: '',
        license: 'Apache-2.0',
        attribution: 'Example Model Lab',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['MISSING_DURABLE_IDENTIFIER']);
  assert.ok(packet.actions.includes('add_checksum_or_doi:model-weights-latest'));
  assert.equal(packet.referenceSignals.exportable, false);
}

function testInvalidChecksumDoesNotCountAsDurableIdentifier() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-invalid-checksum',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'dataset-invalid-checksum',
        kind: 'linked_dataset',
        target: 'https://data.example.invalid/lab-export.csv',
        checksum: 'pending',
        doi: '',
        version: '',
        license: 'CC-BY-4.0',
        attribution: 'Example Lab',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), [
    'INVALID_CHECKSUM_EVIDENCE',
    'MISSING_DURABLE_IDENTIFIER'
  ]);
  assert.ok(packet.actions.includes('add_checksum_or_doi:dataset-invalid-checksum'));
  assert.ok(packet.actions.includes('repair_reference_evidence:dataset-invalid-checksum'));
  assert.equal(packet.referenceSignals.exportable, false);
}

function testDoiPlaceholderDoesNotCountAsDurableIdentifier() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-invalid-doi',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'dataset-invalid-doi',
        kind: 'linked_dataset',
        target: 'https://data.example.invalid/lab-export.csv',
        checksum: '',
        doi: 'pending',
        version: '',
        license: 'CC-BY-4.0',
        attribution: 'Example Lab',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), [
    'INVALID_DOI_EVIDENCE',
    'MISSING_DURABLE_IDENTIFIER'
  ]);
  assert.ok(packet.actions.includes('add_checksum_or_doi:dataset-invalid-doi'));
  assert.ok(packet.actions.includes('repair_reference_evidence:dataset-invalid-doi'));
  assert.equal(packet.referenceSignals.exportable, false);
}

function testFutureDatedVerificationEvidenceIsNotFresh() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-future-verification',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'dataset-future-verified',
        kind: 'linked_dataset',
        target: 'https://doi.org/10.5281/zenodo.7654321',
        checksum: 'sha256:feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface',
        doi: '10.5281/zenodo.7654321',
        license: 'CC-BY-4.0',
        attribution: 'Example Lab',
        lastVerifiedAt: '2026-05-29T12:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['STALE_REFERENCE_EVIDENCE']);
  assert.ok(packet.actions.includes('refresh_reference_verification:dataset-future-verified'));
  assert.equal(packet.referenceSignals.verificationFresh, false);
}

function testFutureDatedApiSnapshotDoesNotCountAsPinnedEvidence() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-future-api-snapshot',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'api-future-snapshot',
        kind: 'api_source',
        target: 'https://api.example.invalid/weather/snapshots/2026-06-01.json',
        snapshotDate: '2026-06-01',
        checksum: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        authRequired: false,
        license: 'CC0-1.0',
        attribution: 'Example Weather API',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['FLOATING_API_REFERENCE']);
  assert.ok(packet.actions.includes('pin_external_reference:api-future-snapshot'));
  assert.equal(packet.referenceSignals.immutablePins, false);
}

function testInvalidApiSnapshotChecksumDoesNotCountAsPinnedEvidence() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-invalid-api-checksum',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'api-invalid-checksum',
        kind: 'api_source',
        target: 'https://api.example.invalid/weather/snapshots/2026-05-01.json',
        snapshotDate: '2026-05-01',
        checksum: 'pending',
        authRequired: false,
        license: 'CC0-1.0',
        attribution: 'Example Weather API',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), [
    'FLOATING_API_REFERENCE',
    'INVALID_CHECKSUM_EVIDENCE'
  ]);
  assert.ok(packet.actions.includes('pin_external_reference:api-invalid-checksum'));
  assert.ok(packet.actions.includes('repair_reference_evidence:api-invalid-checksum'));
  assert.equal(packet.referenceSignals.immutablePins, false);
}

function testTruncatedApiSnapshotChecksumDoesNotCountAsPinnedEvidence() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-truncated-api-checksum',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'api-truncated-checksum',
        kind: 'api_source',
        target: 'https://api.example.invalid/weather/snapshots/2026-05-01.json',
        snapshotDate: '2026-05-01',
        checksum: 'sha256:abcdef',
        authRequired: false,
        license: 'CC0-1.0',
        attribution: 'Example Weather API',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), [
    'FLOATING_API_REFERENCE',
    'INVALID_CHECKSUM_EVIDENCE'
  ]);
  assert.ok(packet.actions.includes('pin_external_reference:api-truncated-checksum'));
  assert.ok(packet.actions.includes('repair_reference_evidence:api-truncated-checksum'));
  assert.equal(packet.referenceSignals.immutablePins, false);
}

function testNullGitCommitShaDoesNotCountAsImmutablePin() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-null-git-pin',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'submodule-null-sha',
        kind: 'git_submodule',
        target: 'https://github.com/example/analysis-tools',
        commitSha: '0000000000000000000000000000000000000000',
        license: 'MIT',
        attribution: 'Example Analysis Tools',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['FLOATING_GIT_REFERENCE']);
  assert.ok(packet.actions.includes('pin_external_reference:submodule-null-sha'));
  assert.equal(packet.referenceSignals.immutablePins, false);
}

function testMissingVerificationEvidenceBlocksOtherwisePinnedReference() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-missing-verification',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'dataset-needs-verification',
        kind: 'linked_dataset',
        target: 'https://doi.org/10.5281/zenodo.2345678',
        checksum: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        doi: '10.5281/zenodo.2345678',
        license: 'CC-BY-4.0',
        attribution: 'Example Lab'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['STALE_REFERENCE_EVIDENCE']);
  assert.ok(packet.actions.includes('refresh_reference_verification:dataset-needs-verification'));
  assert.equal(packet.referenceSignals.verificationFresh, false);
}

function testMalformedOptionalEvidenceBlocksEvenWhenAnotherIdentifierIsValid() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-poisoned-evidence',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'dataset-poisoned-evidence',
        kind: 'linked_dataset',
        target: 'https://doi.org/10.5281/zenodo.3456789',
        checksum: 'sha256:abcdef',
        doi: '10.5281/zenodo.3456789',
        license: 'CC-BY-4.0',
        attribution: 'Example Lab',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      },
      {
        id: 'model-poisoned-citation',
        kind: 'model_weights',
        target: 'https://models.example.invalid/model-v4.bin',
        checksum: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        doi: 'pending',
        version: 'v4.0.0',
        license: 'Apache-2.0',
        attribution: 'Example Model Lab',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), [
    'INVALID_CHECKSUM_EVIDENCE',
    'INVALID_DOI_EVIDENCE'
  ]);
  assert.ok(packet.actions.includes('repair_reference_evidence:dataset-poisoned-evidence'));
  assert.ok(packet.actions.includes('repair_reference_evidence:model-poisoned-citation'));
  assert.equal(packet.referenceSignals.exportable, false);
}

function testMalformedReferenceEntriesBlockReleaseInsteadOfCrashing() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-malformed-entry',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [null]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['MALFORMED_REFERENCE_ENTRY']);
  assert.equal(packet.findings[0].referenceId, 'malformed-reference-entry-1');
  assert.ok(packet.actions.includes('repair_reference_entry:malformed-reference-entry-1'));
  assert.equal(packet.referenceSignals.immutablePins, false);
  assert.equal(packet.referenceSignals.exportable, false);
  assert.equal(packet.referenceSignals.attributionComplete, false);
  assert.equal(packet.referenceSignals.verificationFresh, false);
  assert.deepEqual(packet.referenceSummary, {
    total: 1,
    byKind: {
      unknown: 1
    }
  });
}

function testMalformedReferenceManifestBlocksRelease() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-malformed-manifest',
    assessedAt: '2026-05-28T12:00:00Z',
    references: {
      dataset: {
        id: 'dataset-not-in-list',
        kind: 'linked_dataset',
        target: 'https://doi.org/10.5281/zenodo.4567890'
      }
    }
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['MALFORMED_REFERENCE_MANIFEST']);
  assert.equal(packet.findings[0].referenceId, 'reference-manifest');
  assert.ok(packet.actions.includes('repair_reference_manifest:reference-manifest'));
  assert.equal(packet.referenceSignals.immutablePins, false);
  assert.equal(packet.referenceSignals.exportable, false);
  assert.equal(packet.referenceSignals.attributionComplete, false);
  assert.equal(packet.referenceSignals.verificationFresh, false);
  assert.deepEqual(packet.referenceSummary, {
    total: 1,
    byKind: {
      unknown: 1
    }
  });
}

function testMissingReferenceIdentityBlocksReleaseWithStablePlaceholder() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-missing-identity',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: '   ',
        kind: 'linked_dataset',
        target: 'https://doi.org/10.5281/zenodo.5678901',
        checksum: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        doi: '10.5281/zenodo.5678901',
        license: 'CC-BY-4.0',
        attribution: 'Example Lab',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['MISSING_REFERENCE_ID']);
  assert.equal(packet.findings[0].referenceId, 'unidentified-reference-1');
  assert.ok(packet.actions.includes('assign_reference_id:unidentified-reference-1'));
  assert.equal(packet.referenceSignals.exportable, false);
  assert.deepEqual(packet.referenceSummary, {
    total: 1,
    byKind: {
      linked_dataset: 1
    }
  });
}

function testAuthenticatedReferenceTargetsDoNotEchoSecretMaterial() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-auth-target',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'api-private-snapshot',
        kind: 'api_source',
        target: 'https://reader:super-secret-token@api.example.invalid/export?access_token=secret-token-123&snapshot=latest',
        snapshotDate: '',
        checksum: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        authRequired: true,
        license: 'CC0-1.0',
        attribution: 'Example API',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['AUTH_REQUIRED_REFERENCE', 'FLOATING_API_REFERENCE']);
  assert.equal(packet.findings[0].target.includes('super-secret-token'), false);
  assert.equal(packet.findings[0].target.includes('secret-token-123'), false);
  assert.equal(JSON.stringify(packet).includes('super-secret-token'), false);
  assert.equal(JSON.stringify(packet).includes('secret-token-123'), false);
}

function testMissingRepositoryAssessmentTimestampBlocksOtherwisePinnedReferences() {
  const packet = assessExternalReferences({
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
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['INVALID_REPOSITORY_ASSESSED_AT']);
  assert.equal(packet.findings[0].kind, 'repository');
  assert.ok(packet.actions.includes('repair_repository_assessed_at:repo-reference-missing-assessed-at'));
  assert.equal(packet.referenceSignals.exportable, false);
  assert.equal(packet.referenceSignals.verificationFresh, false);
}

function testPrivateReferenceTargetsAreRedactedBeforeFindings() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-private-target',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'dataset-private-file-target',
        kind: 'api',
        target: 'file:///Users/alice/private-lab/export.csv?token=secret-token-123',
        checksum: null,
        doi: null,
        license: 'CC-BY-4.0',
        attribution: 'Example Lab',
        authRequired: true,
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  const packetJson = JSON.stringify(packet);

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['AUTH_REQUIRED_REFERENCE']);
  assert.equal(packet.findings[0].target, '[redacted-local-path]');
  assert.equal(packetJson.includes('/Users/alice'), false);
  assert.equal(packetJson.includes('private-lab'), false);
  assert.equal(packetJson.includes('secret-token-123'), false);
}

function testMalformedTopLevelRepositoryPacketBlocksReleaseInsteadOfCrashing() {
  const packet = assessExternalReferences(null);

  assert.equal(packet.repositoryId, 'unidentified-repository');
  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['MALFORMED_REPOSITORY_PACKET']);
  assert.equal(packet.findings[0].kind, 'repository');
  assert.ok(packet.actions.includes('repair_repository_packet:unidentified-repository'));
  assert.equal(packet.referenceSignals.immutablePins, false);
  assert.equal(packet.referenceSignals.exportable, false);
  assert.equal(packet.referenceSignals.attributionComplete, false);
  assert.equal(packet.referenceSignals.verificationFresh, false);
  assert.deepEqual(packet.referenceSummary, {
    total: 0,
    byKind: {}
  });
}

const tests = [
  testBlocksFloatingAndNonExportableExternalReferences,
  testAllowsPinnedExportableReferences,
  testStagesReferencesMissingLicenseAttributionOnly,
  testFloatingVersionAliasDoesNotCountAsDurableIdentifier,
  testInvalidChecksumDoesNotCountAsDurableIdentifier,
  testDoiPlaceholderDoesNotCountAsDurableIdentifier,
  testFutureDatedVerificationEvidenceIsNotFresh,
  testFutureDatedApiSnapshotDoesNotCountAsPinnedEvidence,
  testInvalidApiSnapshotChecksumDoesNotCountAsPinnedEvidence,
  testTruncatedApiSnapshotChecksumDoesNotCountAsPinnedEvidence,
  testNullGitCommitShaDoesNotCountAsImmutablePin,
  testMissingVerificationEvidenceBlocksOtherwisePinnedReference,
  testMalformedOptionalEvidenceBlocksEvenWhenAnotherIdentifierIsValid,
  testMalformedReferenceEntriesBlockReleaseInsteadOfCrashing,
  testMalformedReferenceManifestBlocksRelease,
  testMissingReferenceIdentityBlocksReleaseWithStablePlaceholder,
  testAuthenticatedReferenceTargetsDoNotEchoSecretMaterial,
  testMissingRepositoryAssessmentTimestampBlocksOtherwisePinnedReferences,
  testPrivateReferenceTargetsAreRedactedBeforeFindings,
  testMalformedTopLevelRepositoryPacketBlocksReleaseInsteadOfCrashing
];

for (const test of tests) {
  test();
}

console.log(`repository-external-reference-pin-guard tests passed (${tests.length})`);
