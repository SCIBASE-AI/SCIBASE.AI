'use strict';

const { expectedEvidenceRoot, digest } = require('./index');

function evidence(id, type, options = {}) {
  return {
    id,
    type,
    sourceSystem: options.sourceSystem || 'billing-ledger',
    capturedAt: options.capturedAt || '2026-04-30T18:00:00.000Z',
    sha256: options.sha256 || digest({ id, type, sourceSystem: options.sourceSystem || 'billing-ledger' }),
    immutable: options.immutable !== false,
    replicas: options.replicas === undefined ? 2 : options.replicas,
    containsPrivateContent: options.containsPrivateContent === true,
    approved: options.approved,
  };
}

function withRoot(packet) {
  return {
    ...packet,
    evidenceRoot: expectedEvidenceRoot(packet),
  };
}

const cleanSubscriptionPacket = withRoot({
  invoiceId: 'inv-institution-0426',
  customerId: 'inst-cern-lab',
  customerSegment: 'institutional',
  stream: 'subscription',
  amountCents: 1800000,
  invoiceDate: '2026-04-30',
  disputeDeadline: '2026-07-29',
  retainedUntil: '2031-05-01',
  storageLockUntil: '2026-08-15',
  evidence: [
    evidence('contract-cern-2026', 'contract', { sourceSystem: 'contract-vault' }),
    evidence('entitlements-cern-0426', 'entitlement_snapshot', { sourceSystem: 'entitlement-service' }),
    evidence('invoice-cern-0426', 'invoice', { sourceSystem: 'invoice-ledger' }),
    evidence('po-cern-2026', 'payment_or_po', { sourceSystem: 'erp-connector' }),
  ],
  deletionRequests: [],
});

const lowReplicaSubscriptionPacket = withRoot({
  invoiceId: 'inv-lab-0426',
  customerId: 'lab-microscopy-core',
  customerSegment: 'lab',
  stream: 'subscription',
  amountCents: 420000,
  invoiceDate: '2026-04-30',
  disputeDeadline: '2026-06-29',
  retainedUntil: '2031-05-01',
  storageLockUntil: '2026-07-15',
  evidence: [
    evidence('contract-lab-2026', 'contract', { sourceSystem: 'contract-vault', replicas: 1 }),
    evidence('entitlements-lab-0426', 'entitlement_snapshot', { sourceSystem: 'entitlement-service' }),
    evidence('invoice-lab-0426', 'invoice', { sourceSystem: 'invoice-ledger' }),
    evidence('card-lab-0426', 'payment_or_po', { sourceSystem: 'payment-rail' }),
  ],
  deletionRequests: [],
});

const computePacketMissingCostTrace = withRoot({
  invoiceId: 'inv-compute-0426',
  customerId: 'lab-foundation-model',
  customerSegment: 'lab',
  stream: 'ai_compute',
  amountCents: 960000,
  invoiceDate: '2026-04-30',
  disputeDeadline: '2026-07-29',
  retainedUntil: '2028-04-30',
  storageLockUntil: '2026-06-30',
  evidence: [
    evidence('job-manifest-foundation-17', 'job_manifest', { sourceSystem: 'run-orchestrator' }),
    evidence('meter-reading-foundation-17', 'meter_reading', { sourceSystem: 'usage-meter' }),
    evidence('usage-summary-foundation-17', 'customer_usage_summary', { sourceSystem: 'billing-ledger' }),
  ],
  deletionRequests: [],
});

const analyticsLicenseWithPrivateContent = withRoot({
  invoiceId: 'inv-nih-license-0426',
  customerId: 'gov-nih-policy',
  customerSegment: 'government',
  stream: 'analytics_license',
  amountCents: 5400000,
  invoiceDate: '2026-04-30',
  disputeDeadline: '2026-08-28',
  retainedUntil: '2033-05-01',
  storageLockUntil: '2026-09-15',
  evidence: [
    evidence('license-nih-2026', 'license_terms', { sourceSystem: 'contract-vault' }),
    evidence('export-nih-topic-trends', 'export_manifest', { sourceSystem: 'analytics-exporter', containsPrivateContent: true }),
    evidence('privacy-review-nih', 'privacy_review', { sourceSystem: 'privacy-review-queue', approved: false }),
    evidence('usage-summary-nih-license', 'customer_usage_summary', { sourceSystem: 'billing-ledger' }),
  ],
  deletionRequests: [],
});

const legalHoldComputePacket = withRoot({
  invoiceId: 'inv-gov-compute-0426',
  customerId: 'gov-eu-reproducibility',
  customerSegment: 'government',
  stream: 'ai_compute',
  amountCents: 2200000,
  invoiceDate: '2026-04-30',
  disputeDeadline: '2026-08-28',
  retainedUntil: '2033-05-01',
  storageLockUntil: '2026-09-15',
  legalHold: {
    active: true,
    holdUntil: '2033-05-01',
    reason: 'Government audit sample and procurement dispute window',
  },
  evidence: [
    evidence('job-manifest-eu-44', 'job_manifest', { sourceSystem: 'run-orchestrator' }),
    evidence('meter-reading-eu-44', 'meter_reading', { sourceSystem: 'usage-meter' }),
    evidence('cost-trace-eu-44', 'cost_trace', { sourceSystem: 'cloud-cost-allocator' }),
    evidence('usage-summary-eu-44', 'customer_usage_summary', { sourceSystem: 'billing-ledger' }),
  ],
  deletionRequests: [
    { id: 'erase-eu-44-raw', scheduledFor: '2026-06-30', status: 'queued' },
  ],
});

const register = {
  checkedAt: '2026-05-20T00:00:00.000Z',
  invoicePackets: [
    cleanSubscriptionPacket,
    lowReplicaSubscriptionPacket,
    computePacketMissingCostTrace,
    analyticsLicenseWithPrivateContent,
    legalHoldComputePacket,
  ],
};

const cleanRegister = {
  checkedAt: register.checkedAt,
  invoicePackets: [cleanSubscriptionPacket],
};

module.exports = {
  register,
  cleanRegister,
  cleanSubscriptionPacket,
  lowReplicaSubscriptionPacket,
  computePacketMissingCostTrace,
  analyticsLicenseWithPrivateContent,
  legalHoldComputePacket,
};
