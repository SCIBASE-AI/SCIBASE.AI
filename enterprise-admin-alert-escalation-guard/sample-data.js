'use strict';

module.exports = [
  {
    id: 'ALERT-COMPLIANCE-001',
    category: 'compliance_deadline',
    severity: 'critical',
    dueAt: '2026-05-22T18:00:00Z',
    owner: { id: 'research-office-primary', active: false, onLeave: true },
    routing: {
      channels: ['admin_digest'],
      muted: true,
      quietHours: true,
      duplicateSuppressed: true,
      digest: { enabled: true, delayHours: 12 }
    },
    webhook: { required: true, failureRate: 0.32 }
  },
  {
    id: 'ALERT-WEBHOOK-022',
    category: 'security_integration',
    severity: 'high',
    dueAt: '2026-05-24T09:00:00Z',
    owner: { id: 'integration-admin', active: true, onLeave: false },
    routing: {
      channels: ['slack', 'admin_inbox'],
      muted: false,
      quietHours: false,
      duplicateSuppressed: false,
      digest: { enabled: false, delayHours: 0 }
    },
    webhook: { required: true, failureRate: 0.24 }
  },
  {
    id: 'ALERT-DASHBOARD-077',
    category: 'usage_anomaly',
    severity: 'medium',
    dueAt: '2026-05-29T12:00:00Z',
    owner: { id: 'department-chair', active: true, onLeave: false },
    routing: {
      channels: [],
      muted: false,
      quietHours: false,
      duplicateSuppressed: false,
      digest: { enabled: true, delayHours: 2 }
    },
    webhook: { required: false, failureRate: 0 }
  },
  {
    id: 'ALERT-INFO-100',
    category: 'weekly_summary',
    severity: 'low',
    dueAt: '2026-06-05T12:00:00Z',
    owner: { id: 'research-ops', active: true, onLeave: false },
    routing: {
      channels: ['admin_digest'],
      muted: false,
      quietHours: false,
      duplicateSuppressed: false,
      digest: { enabled: true, delayHours: 2 }
    },
    webhook: { required: false, failureRate: 0 }
  }
];
