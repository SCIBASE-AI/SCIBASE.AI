'use strict';

const assert = require('assert');
const {
  evaluateBatch,
  evaluateRequest,
  getActiveHolds,
  getCoOwnerConsentRatio,
  requiresCitationTombstone
} = require('./index');

const asOfDate = '2026-05-22';

function request(overrides) {
  return Object.assign({
    id: 'DEL-100',
    type: 'project_deletion',
    requestedAt: '2026-05-21',
    actor: {
      projectRole: 'owner',
      identityVerified: true,
      mfaVerifiedAt: '2026-05-20'
    },
    project: {
      id: 'proj-alpha',
      title: 'Private Draft Workspace',
      visibility: 'private',
      activeCollaborators: 0,
      coOwners: [
        { id: 'u-1', consent: 'approved' }
      ],
      citations: {
        doi: null,
        publicCitations: 0,
        downstreamForks: 0
      }
    },
    holds: [],
    linkedProjects: [],
    anonymousReviewEscrow: {},
    recoveryWindowDays: 30
  }, overrides || {});
}

function testRetentionHoldBlocksDeletion() {
  const sample = request({
    id: 'DEL-HOLD',
    holds: [
      { type: 'irb_retention', status: 'active', expiresAt: '2027-01-01' }
    ]
  });

  const packet = evaluateRequest(sample, { asOfDate });

  assert.equal(packet.action, 'steward_review_required');
  assert.equal(packet.severity, 'critical');
  assert.deepEqual(packet.activeHoldTypes, ['irb_retention']);
  assert.equal(getActiveHolds(sample, { asOfDate, stewardHoldTypes: ['irb_retention'] }).length, 1);
}

function testCoOwnerConsentBlocksDeletion() {
  const sample = request({
    id: 'DEL-CONSENT',
    project: {
      id: 'proj-beta',
      visibility: 'private',
      activeCollaborators: 3,
      coOwners: [
        { id: 'u-1', consent: 'approved' },
        { id: 'u-2', consent: 'pending' },
        { id: 'u-3', consent: 'denied' }
      ],
      citations: {}
    }
  });

  const packet = evaluateRequest(sample, { asOfDate });

  assert.equal(getCoOwnerConsentRatio(sample.project), 1 / 3);
  assert.equal(packet.action, 'collect_coowner_consent');
  assert.equal(packet.finalizationMode, 'blocked');
}

function testPublicDoiProjectGetsTombstone() {
  const sample = request({
    id: 'DEL-DOI',
    project: {
      id: 'proj-public',
      visibility: 'public',
      activeCollaborators: 0,
      coOwners: [{ id: 'u-1', consent: 'approved' }],
      citations: {
        doi: '10.5555/scibase.public.1',
        publicCitations: 12,
        downstreamForks: 2
      }
    }
  });

  const packet = evaluateRequest(sample, { asOfDate });

  assert.equal(requiresCitationTombstone(sample.project), true);
  assert.equal(packet.action, 'approve_tombstone_delete');
  assert.equal(packet.finalizationMode, 'tombstone');
  assert.ok(packet.actions.includes('create citation-safe project tombstone with DOI/version redirect'));
}

function testProfileErasurePreservesAttribution() {
  const sample = request({
    id: 'ERASE-PROFILE',
    type: 'profile_erasure',
    project: null,
    linkedProjects: [
      { id: 'proj-a', role: 'author' },
      { id: 'proj-b', role: 'viewer' }
    ]
  });

  const packet = evaluateRequest(sample, { asOfDate });

  assert.equal(packet.action, 'detach_profile_preserve_attribution');
  assert.equal(packet.finalizationMode, 'redacted_erasure');
  assert.ok(packet.actions.includes('preserve minimal attribution hashes on authored projects and reviews'));
}

function testAnonymousEscrowPreserved() {
  const sample = request({
    id: 'ERASE-ESCROW',
    type: 'profile_erasure',
    project: null,
    linkedProjects: [],
    anonymousReviewEscrow: {
      activePseudonyms: 2,
      pendingAppeals: 1
    }
  });

  const packet = evaluateRequest(sample, { asOfDate });

  assert.equal(packet.action, 'preserve_anonymous_review_escrow');
  assert.equal(packet.anonymousEscrowRequired, true);
}

function testIdentityGateBlocksRequest() {
  const packet = evaluateRequest(request({
    id: 'DEL-IDENTITY',
    actor: {
      projectRole: 'owner',
      identityVerified: false,
      mfaVerifiedAt: '2026-05-20'
    }
  }), { asOfDate });

  assert.equal(packet.action, 'hold_identity_verification');
  assert.equal(packet.severity, 'high');
}

function testRecoverablePrivateDeleteApproved() {
  const packet = evaluateRequest(request({ id: 'DEL-APPROVE' }), { asOfDate });

  assert.equal(packet.action, 'approve_recoverable_delete');
  assert.equal(packet.finalizationMode, 'recoverable_delete');
  assert.equal(packet.auditDigest.length, 64);
}

function testBatchSummary() {
  const batch = evaluateBatch([
    request({ id: 'DEL-APPROVE' }),
    request({
      id: 'DEL-HOLD',
      holds: [{ type: 'legal_hold', status: 'active', expiresAt: '2026-12-31' }]
    }),
    request({
      id: 'DEL-DOI',
      project: {
        id: 'proj-public',
        visibility: 'public',
        activeCollaborators: 0,
        coOwners: [{ id: 'u-1', consent: 'approved' }],
        citations: { doi: '10.5555/demo', publicCitations: 1, downstreamForks: 0 }
      }
    })
  ], { asOfDate });

  assert.equal(batch.requestCount, 3);
  assert.equal(batch.byAction.approve_recoverable_delete, 1);
  assert.equal(batch.byAction.steward_review_required, 1);
  assert.equal(batch.byAction.approve_tombstone_delete, 1);
  assert.ok(batch.blockedRequests.includes('DEL-HOLD'));
}

const tests = [
  testRetentionHoldBlocksDeletion,
  testCoOwnerConsentBlocksDeletion,
  testPublicDoiProjectGetsTombstone,
  testProfileErasurePreservesAttribution,
  testAnonymousEscrowPreserved,
  testIdentityGateBlocksRequest,
  testRecoverablePrivateDeleteApproved,
  testBatchSummary
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} project deletion erasure guard tests passed`);
