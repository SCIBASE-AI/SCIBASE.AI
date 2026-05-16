import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSlaPortfolio,
  summarizeExportJob,
  summarizeService,
  summarizeWebhookDelivery,
} from '../src/sla-uptime-monitor.js';

const baseInput = Object.freeze({
  generatedAt: '2026-05-16T12:00:00Z',
  windowMinutes: 1000,
  tenants: [{ id: 'tenant-a', name: 'Tenant A', defaultSlaTarget: 0.99 }],
  services: [
    {
      id: 'service-breach',
      name: 'Breached Service',
      tenantId: 'tenant-a',
      slaTarget: 0.99,
      observedChecks: 100,
      failedChecks: 3,
      plannedMaintenanceMinutes: 5,
      unplannedDowntimeMinutes: 15,
      owner: 'ops',
    },
    {
      id: 'service-watch',
      name: 'Watch Service',
      tenantId: 'tenant-a',
      slaTarget: 0.99,
      observedChecks: 100,
      failedChecks: 0,
      plannedMaintenanceMinutes: 0,
      unplannedDowntimeMinutes: 8,
      owner: 'integrations',
    },
    {
      id: 'service-ok',
      name: 'Healthy Service',
      tenantId: 'tenant-a',
      slaTarget: 0.99,
      observedChecks: 100,
      failedChecks: 0,
      plannedMaintenanceMinutes: 0,
      unplannedDowntimeMinutes: 1,
      owner: 'data-platform',
    },
  ],
  incidents: [
    {
      id: 'INC-1',
      serviceId: 'service-breach',
      tenantId: 'tenant-a',
      startedAt: '2026-05-16T10:00:00Z',
      resolvedAt: '2026-05-16T10:15:00Z',
      customerVisible: true,
    },
  ],
  webhookDeliveries: [
    {
      destinationId: 'archive-sync',
      tenantId: 'tenant-a',
      serviceId: 'service-watch',
      attempts: 100,
      failures: 4,
      requiresNotice: true,
    },
  ],
  exportJobs: [
    {
      id: 'EXP-1',
      tenantId: 'tenant-a',
      serviceId: 'service-breach',
      target: 'admin-dashboard',
      containsSlaEvidence: true,
      requestedBy: 'admin',
    },
    {
      id: 'EXP-2',
      tenantId: 'tenant-a',
      serviceId: 'service-ok',
      target: 'funder-pack',
      containsSlaEvidence: true,
      requestedBy: 'admin',
    },
  ],
});

test('summarizes service posture from uptime and error budget', () => {
  const breach = summarizeService(baseInput.services[0], baseInput.tenants[0], baseInput.incidents, 1000);
  assert.equal(breach.status, 'breach');
  assert.equal(breach.budgetMinutes, 10);
  assert.equal(breach.errorBudgetRemainingMinutes, -5);
  assert.equal(breach.mttrMinutes, 15);

  const watch = summarizeService(baseInput.services[1], baseInput.tenants[0], [], 1000);
  assert.equal(watch.status, 'watch');
  assert.equal(watch.errorBudgetRemainingMinutes, 2);

  const healthy = summarizeService(baseInput.services[2], baseInput.tenants[0], [], 1000);
  assert.equal(healthy.status, 'within_sla');
});

test('routes webhook reliability review when failure rate is above threshold', () => {
  const delivery = summarizeWebhookDelivery(baseInput.webhookDeliveries[0], { status: 'watch' });
  assert.equal(delivery.status, 'review_required');
  assert.equal(delivery.failureRate, 0.04);
});

test('blocks SLA evidence exports for breached services only', () => {
  const blocked = summarizeExportJob(baseInput.exportJobs[0], { status: 'breach' });
  assert.equal(blocked.status, 'blocked_pending_sla_review');

  const ready = summarizeExportJob(baseInput.exportJobs[1], { status: 'within_sla' });
  assert.equal(ready.status, 'ready');
});

test('builds deterministic admin metrics, actions, and evidence digest', () => {
  const report = evaluateSlaPortfolio(structuredClone(baseInput), { digestSalt: 'test-salt' });
  assert.equal(report.adminMetrics.serviceCount, 3);
  assert.equal(report.adminMetrics.breachedServices, 1);
  assert.equal(report.adminMetrics.watchServices, 1);
  assert.equal(report.adminMetrics.exportsBlocked, 1);
  assert.equal(report.adminMetrics.webhookDestinationsNeedingReview, 1);
  assert.equal(report.actionQueue.length, 4);
  assert.match(report.evidenceDigest, /^[a-f0-9]{64}$/);

  const again = evaluateSlaPortfolio(structuredClone(baseInput), { digestSalt: 'test-salt' });
  assert.equal(report.evidenceDigest, again.evidenceDigest);
});

test('rejects invalid SLA target values', () => {
  assert.throws(
    () => summarizeService({ ...baseInput.services[0], slaTarget: 1.2 }, baseInput.tenants[0], [], 1000),
    /SLA target/,
  );
});
