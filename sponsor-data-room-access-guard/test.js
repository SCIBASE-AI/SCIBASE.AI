'use strict';

const assert = require('assert');
const sampleData = require('./sample-data');
const {
  evaluateDataRoomAccess,
  toMarkdownReport,
  toSvgSummary
} = require('./index');

function testHoldWhenGrantHasBlockingAccessRisk() {
  const result = evaluateDataRoomAccess(sampleData);
  assert.strictEqual(result.status, 'hold_data_room');
  assert.ok(result.summary.blockers.some((item) => item.message.includes('prequalification is pending')));
  assert.ok(result.summary.blockers.some((item) => item.message.includes('NDA acceptance is missing')));
  assert.ok(result.summary.blockers.some((item) => item.message.includes('non-sponsor grant has write access')));
  assert.ok(result.summary.blockers.some((item) => item.message.includes('grant is expired')));
}

function testReadyWhenAllGrantsAreLeastPrivilegeAndCurrent() {
  const safeData = {
    ...sampleData,
    grants: sampleData.grants.slice(0, 3).map((grant) => ({
      ...grant,
      scope: grant.holderRole === 'sponsor' ? 'write' : 'read',
      expiresAt: '2026-05-29T09:00:00.000Z',
      lastAccessedAt: '2026-05-21T08:00:00.000Z'
    }))
  };
  const result = evaluateDataRoomAccess(safeData);
  assert.strictEqual(result.status, 'data_room_ready');
  assert.strictEqual(result.summary.blockers.length, 0);
}

function testExpiryWarningDoesNotBlock() {
  const result = evaluateDataRoomAccess(sampleData);
  const solverReview = result.reviews.find((review) => review.grantId === 'grant-solver-team-014');
  assert.ok(solverReview.warnings.some((warning) => warning.includes('expires in 19 hours')));
  assert.ok(!solverReview.blockers.some((blocker) => blocker.includes('expired')));
}

function testStaleAccessCreatesAuditEvent() {
  const result = evaluateDataRoomAccess(sampleData);
  const reviewer = result.reviews.find((review) => review.grantId === 'grant-reviewer-003');
  assert.ok(reviewer.warnings.some((warning) => warning.includes('unused for 96 hours')));
  assert.ok(reviewer.auditEvents.some((event) => event.type === 'stale_access_review'));
}

function testReportArtifactsRender() {
  const result = evaluateDataRoomAccess(sampleData);
  const markdown = toMarkdownReport(result);
  const svg = toSvgSummary(result);
  assert.ok(markdown.includes('Sponsor Data-Room Access Guard Report'));
  assert.ok(markdown.includes('Sponsor Remediation Actions'));
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('HOLD'));
}

const tests = [
  testHoldWhenGrantHasBlockingAccessRisk,
  testReadyWhenAllGrantsAreLeastPrivilegeAndCurrent,
  testExpiryWarningDoesNotBlock,
  testStaleAccessCreatesAuditEvent,
  testReportArtifactsRender
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} tests passed`);
