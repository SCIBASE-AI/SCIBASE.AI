'use strict';

const assert = require('assert');
const sampleAlerts = require('./sample-data');
const { evaluateAlert, evaluateAlerts, hoursUntil } = require('./index');

const asOfDate = '2026-05-22';

function testHoursUntil() {
  assert.equal(hoursUntil('2026-05-22T18:00:00Z', asOfDate), 18);
}

function testCriticalAlertBypassesMuteDigestAndQuietHours() {
  const packet = evaluateAlert(sampleAlerts[0], { asOfDate });

  assert.equal(packet.action, 'deliver_now_and_escalate');
  assert.equal(packet.decisionSeverity, 'critical');
  assert.ok(packet.findings.some((finding) => finding.code === 'urgent_alert_muted'));
  assert.ok(packet.findings.some((finding) => finding.code === 'urgent_alert_delayed_by_digest'));
  assert.ok(packet.findings.some((finding) => finding.code === 'quiet_hours_override_required'));
  assert.ok(packet.dashboardBadges.includes('bypass-digest'));
  assert.equal(packet.webhookEvent.requiresAcknowledgement, true);
}

function testWebhookFailureFallbackForHighSeverity() {
  const packet = evaluateAlert(sampleAlerts[1], { asOfDate });

  assert.equal(packet.action, 'hold_digest_and_route_owner_fallback');
  assert.equal(packet.decisionSeverity, 'high');
  assert.ok(packet.findings.some((finding) => finding.code === 'webhook_health_fallback_required'));
  assert.ok(packet.dashboardBadges.includes('webhook-fallback'));
}

function testMissingChannelWarnsMediumAlert() {
  const packet = evaluateAlert(sampleAlerts[2], { asOfDate });

  assert.equal(packet.action, 'warn_and_repair_delivery_path');
  assert.equal(packet.decisionSeverity, 'medium');
  assert.ok(packet.findings.some((finding) => finding.code === 'missing_delivery_channel'));
}

function testStandardDigestAllowed() {
  const packet = evaluateAlert(sampleAlerts[3], { asOfDate });

  assert.equal(packet.action, 'allow_digest_or_standard_delivery');
  assert.equal(packet.findingCount, 0);
  assert.ok(packet.dashboardBadges.includes('standard-delivery'));
}

function testDuplicateSuppressionNearDeadline() {
  const packet = evaluateAlert({
    id: 'ALERT-DEDUPE',
    category: 'export_failure',
    severity: 'high',
    dueAt: '2026-05-22T20:00:00Z',
    owner: { id: 'export-admin', active: true, onLeave: false },
    routing: {
      channels: ['admin_inbox'],
      muted: false,
      quietHours: false,
      duplicateSuppressed: true,
      digest: { enabled: false, delayHours: 0 }
    },
    webhook: { required: false, failureRate: 0 }
  }, { asOfDate });

  assert.equal(packet.action, 'hold_digest_and_route_owner_fallback');
  assert.ok(packet.findings.some((finding) => finding.code === 'duplicate_suppression_near_deadline'));
  assert.ok(packet.dashboardBadges.includes('deadline-visible'));
}

function testPortfolioSummary() {
  const portfolio = evaluateAlerts(sampleAlerts, { asOfDate });

  assert.equal(portfolio.alertCount, 4);
  assert.equal(portfolio.byAction.deliver_now_and_escalate, 1);
  assert.equal(portfolio.byAction.hold_digest_and_route_owner_fallback, 1);
  assert.equal(portfolio.byAction.warn_and_repair_delivery_path, 1);
  assert.equal(portfolio.byAction.allow_digest_or_standard_delivery, 1);
  assert.ok(portfolio.escalatedAlerts.includes('ALERT-COMPLIANCE-001'));
  assert.equal(portfolio.auditDigest.length, 64);
}

const tests = [
  testHoursUntil,
  testCriticalAlertBypassesMuteDigestAndQuietHours,
  testWebhookFailureFallbackForHighSeverity,
  testMissingChannelWarnsMediumAlert,
  testStandardDigestAllowed,
  testDuplicateSuppressionNearDeadline,
  testPortfolioSummary
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} enterprise admin alert escalation guard tests passed`);
