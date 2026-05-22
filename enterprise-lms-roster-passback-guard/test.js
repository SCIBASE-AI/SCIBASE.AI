const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateLmsSyncGuard,
  buildLmsSyncReport,
} = require('./index');

test('blocks LMS sync when enrollment section is outside approved enterprise scope', () => {
  const result = evaluateLmsSyncGuard({
    syncId: 'sync-canvas-biology',
    generatedAt: '2026-05-22T14:40:00Z',
    institution: 'North Valley University',
    approvedSections: ['BIO-501-A', 'BIO-501-B'],
    gradeReleaseWindow: {opensAt: '2026-05-20T00:00:00Z', closesAt: '2026-05-30T00:00:00Z'},
    roster: [
      {userId: 'u-ada', role: 'student', sectionId: 'BIO-501-A', status: 'active', orcid: '0000-0001', consent: true},
      {userId: 'u-ben', role: 'student', sectionId: 'CHEM-999-Z', status: 'active', orcid: '0000-0002', consent: true},
    ],
    passbackEvents: [],
    webhookReceipts: [{eventId: 'roster-1', acknowledged: true, receivedAt: '2026-05-22T14:41:00Z'}],
  });

  assert.equal(result.decision, 'block-sync');
  assert.equal(result.findings[0].type, 'out-of-scope-section');
  assert.equal(result.findings[0].userId, 'u-ben');
  assert.equal(result.summary.outOfScopeEnrollments, 1);
});

test('requires admin review for stale enrollment drops and missing ORCID linkage', () => {
  const result = evaluateLmsSyncGuard({
    syncId: 'sync-moodle-physics',
    generatedAt: '2026-05-22T14:40:00Z',
    institution: 'North Valley University',
    approvedSections: ['PHYS-610-A'],
    gradeReleaseWindow: {opensAt: '2026-05-20T00:00:00Z', closesAt: '2026-05-30T00:00:00Z'},
    roster: [
      {userId: 'u-clio', role: 'student', sectionId: 'PHYS-610-A', status: 'dropped', lastChangedAt: '2026-05-01T00:00:00Z', orcid: '0000-0003', consent: true},
      {userId: 'u-drew', role: 'instructor', sectionId: 'PHYS-610-A', status: 'active', lastChangedAt: '2026-05-22T00:00:00Z', orcid: '', consent: true},
    ],
    passbackEvents: [],
    webhookReceipts: [{eventId: 'roster-2', acknowledged: true, receivedAt: '2026-05-22T14:41:00Z'}],
  });

  assert.equal(result.decision, 'needs-admin-review');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['stale-dropped-enrollment', 'missing-orcid-linkage']
  );
  assert.equal(result.requiredActions.length, 2);
});

test('holds grade passback outside release window or without webhook acknowledgement', () => {
  const result = evaluateLmsSyncGuard({
    syncId: 'sync-grade-passback',
    generatedAt: '2026-05-22T14:40:00Z',
    institution: 'North Valley University',
    approvedSections: ['CS-720-A'],
    gradeReleaseWindow: {opensAt: '2026-05-20T00:00:00Z', closesAt: '2026-05-21T00:00:00Z'},
    roster: [
      {userId: 'u-erin', role: 'student', sectionId: 'CS-720-A', status: 'active', lastChangedAt: '2026-05-22T00:00:00Z', orcid: '0000-0004', consent: true},
    ],
    passbackEvents: [
      {eventId: 'grade-1', userId: 'u-erin', sectionId: 'CS-720-A', score: 94, releasedAt: '2026-05-22T14:00:00Z'},
      {eventId: 'grade-2', userId: 'u-erin', sectionId: 'CS-720-A', score: 88, releasedAt: '2026-05-20T14:00:00Z'},
    ],
    webhookReceipts: [{eventId: 'grade-1', acknowledged: true, receivedAt: '2026-05-22T14:01:00Z'}],
  });

  assert.equal(result.decision, 'hold-passback');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['grade-release-window-violation', 'missing-webhook-acknowledgement']
  );
});

test('approves clean LMS roster and grade passback packet with deterministic report', () => {
  const result = evaluateLmsSyncGuard({
    syncId: 'sync-clean-lms',
    generatedAt: '2026-05-22T14:40:00Z',
    institution: 'North Valley University',
    approvedSections: ['BIO-501-A'],
    gradeReleaseWindow: {opensAt: '2026-05-20T00:00:00Z', closesAt: '2026-05-30T00:00:00Z'},
    roster: [
      {userId: 'u-fox', role: 'student', sectionId: 'BIO-501-A', status: 'active', lastChangedAt: '2026-05-22T00:00:00Z', orcid: '0000-0005', consent: true},
      {userId: 'u-gia', role: 'instructor', sectionId: 'BIO-501-A', status: 'active', lastChangedAt: '2026-05-22T00:00:00Z', orcid: '0000-0006', consent: true},
    ],
    passbackEvents: [
      {eventId: 'grade-clean', userId: 'u-fox', sectionId: 'BIO-501-A', score: 91, releasedAt: '2026-05-22T14:00:00Z'},
    ],
    webhookReceipts: [
      {eventId: 'grade-clean', acknowledged: true, receivedAt: '2026-05-22T14:01:00Z'},
      {eventId: 'roster-clean', acknowledged: true, receivedAt: '2026-05-22T14:02:00Z'},
    ],
  });

  assert.equal(result.decision, 'approve-sync');
  assert.equal(result.findings.length, 0);
  assert.equal(result.syncReadinessScore, 100);

  const report = buildLmsSyncReport(result);
  assert.match(report, /# Enterprise LMS Roster Passback Guard Report/);
  assert.match(report, /Sync: sync-clean-lms/);
  assert.match(report, /Decision: approve-sync/);
  assert.match(report, /Findings: 0/);
});
