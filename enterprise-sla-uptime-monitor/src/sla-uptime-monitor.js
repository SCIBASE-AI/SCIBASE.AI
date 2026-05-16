import { createHash } from 'node:crypto';

const DEFAULT_WINDOW_MINUTES = 30 * 24 * 60;
const WATCH_BUDGET_RATIO = 0.25;
const WEBHOOK_FAILURE_WATCH_RATE = 0.02;

export function evaluateSlaPortfolio(input, options = {}) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('evaluateSlaPortfolio requires an input object');
  }

  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const windowMinutes = toPositiveNumber(input.windowMinutes, DEFAULT_WINDOW_MINUTES);
  const tenants = indexBy(input.tenants ?? [], 'id');
  const incidentsByService = groupBy(input.incidents ?? [], 'serviceId');
  const serviceSummaries = (input.services ?? []).map((service) =>
    summarizeService(service, tenants.get(service.tenantId), incidentsByService.get(service.id) ?? [], windowMinutes),
  );
  const serviceMap = indexBy(serviceSummaries, 'serviceId');
  const webhookSummaries = (input.webhookDeliveries ?? []).map((delivery) =>
    summarizeWebhookDelivery(delivery, serviceMap.get(delivery.serviceId)),
  );
  const exportSummaries = (input.exportJobs ?? []).map((job) =>
    summarizeExportJob(job, serviceMap.get(job.serviceId)),
  );
  const actionQueue = buildActionQueue(serviceSummaries, webhookSummaries, exportSummaries);
  const adminMetrics = buildAdminMetrics(serviceSummaries, webhookSummaries, exportSummaries, actionQueue);
  const evidencePacket = {
    generatedAt,
    windowMinutes,
    serviceSummaries,
    webhookSummaries,
    exportSummaries,
    adminMetrics,
    actionQueue,
  };

  return {
    ...evidencePacket,
    evidenceDigest: digestEvidence(evidencePacket, options.digestSalt ?? 'scibase-sla-offline-demo'),
  };
}

export function summarizeService(service, tenant, incidents, windowMinutes = DEFAULT_WINDOW_MINUTES) {
  if (!service?.id) {
    throw new TypeError('service entries must include an id');
  }

  const slaTarget = toRate(service.slaTarget ?? tenant?.defaultSlaTarget ?? 0.995);
  const unplannedDowntimeMinutes = toNonNegativeNumber(service.unplannedDowntimeMinutes, 0);
  const plannedMaintenanceMinutes = toNonNegativeNumber(service.plannedMaintenanceMinutes, 0);
  const budgetMinutes = round(windowMinutes * (1 - slaTarget), 2);
  const errorBudgetRemainingMinutes = round(budgetMinutes - unplannedDowntimeMinutes, 2);
  const uptime = round(1 - unplannedDowntimeMinutes / windowMinutes, 6);
  const failedChecks = toNonNegativeNumber(service.failedChecks, 0);
  const observedChecks = toPositiveNumber(service.observedChecks, 1);
  const failedCheckRate = round(failedChecks / observedChecks, 6);
  const incidentDurations = incidents.map(durationMinutes).filter((duration) => duration >= 0);
  const mttrMinutes = incidentDurations.length
    ? round(incidentDurations.reduce((sum, duration) => sum + duration, 0) / incidentDurations.length, 2)
    : 0;
  const status = classifyService({ errorBudgetRemainingMinutes, budgetMinutes, failedCheckRate });

  return {
    serviceId: service.id,
    serviceName: service.name ?? service.id,
    tenantId: service.tenantId,
    tenantName: tenant?.name ?? service.tenantId,
    owner: service.owner ?? 'unassigned',
    slaTarget,
    uptime,
    unplannedDowntimeMinutes,
    plannedMaintenanceMinutes,
    budgetMinutes,
    errorBudgetRemainingMinutes,
    failedCheckRate,
    incidentCount: incidents.length,
    customerVisibleIncidents: incidents.filter((incident) => incident.customerVisible).length,
    mttrMinutes,
    incidentIds: incidents.map((incident) => incident.id).filter(Boolean),
    status,
  };
}

export function summarizeWebhookDelivery(delivery, serviceSummary) {
  if (!delivery?.destinationId) {
    throw new TypeError('webhook deliveries must include a destinationId');
  }

  const attempts = toPositiveNumber(delivery.attempts, 1);
  const failures = toNonNegativeNumber(delivery.failures, 0);
  const failureRate = round(failures / attempts, 6);
  const serviceStatus = serviceSummary?.status ?? 'unknown';
  const needsReview = failureRate > WEBHOOK_FAILURE_WATCH_RATE || serviceStatus === 'breach';

  return {
    destinationId: delivery.destinationId,
    tenantId: delivery.tenantId,
    serviceId: delivery.serviceId,
    attempts,
    failures,
    failureRate,
    lastFailureAt: delivery.lastFailureAt ?? '',
    requiresNotice: Boolean(delivery.requiresNotice),
    serviceStatus,
    status: needsReview ? 'review_required' : 'healthy',
  };
}

export function summarizeExportJob(job, serviceSummary) {
  if (!job?.id) {
    throw new TypeError('export jobs must include an id');
  }

  const serviceStatus = serviceSummary?.status ?? 'unknown';
  const hasEvidence = Boolean(job.containsSlaEvidence);
  const blocked = serviceStatus === 'breach' && hasEvidence;

  return {
    exportId: job.id,
    tenantId: job.tenantId,
    serviceId: job.serviceId,
    target: job.target ?? 'unspecified',
    requestedBy: job.requestedBy ?? 'unknown',
    containsSlaEvidence: hasEvidence,
    serviceStatus,
    status: blocked ? 'blocked_pending_sla_review' : 'ready',
    reason: blocked
      ? 'Export includes SLA evidence for a service that has exhausted its error budget.'
      : 'Export evidence is consistent with current service posture.',
  };
}

function buildActionQueue(serviceSummaries, webhookSummaries, exportSummaries) {
  const actions = [];

  for (const service of serviceSummaries) {
    if (service.status === 'breach') {
      actions.push({
        type: 'sla_breach_notice',
        priority: 'high',
        tenantId: service.tenantId,
        serviceId: service.serviceId,
        summary: `${service.serviceName} exhausted its error budget by ${Math.abs(service.errorBudgetRemainingMinutes)} minutes.`,
      });
    } else if (service.status === 'watch') {
      actions.push({
        type: 'error_budget_watch',
        priority: 'medium',
        tenantId: service.tenantId,
        serviceId: service.serviceId,
        summary: `${service.serviceName} has less than ${Math.round(WATCH_BUDGET_RATIO * 100)}% of error budget remaining.`,
      });
    }
  }

  for (const delivery of webhookSummaries) {
    if (delivery.status === 'review_required') {
      actions.push({
        type: 'webhook_reliability_review',
        priority: delivery.requiresNotice ? 'high' : 'medium',
        tenantId: delivery.tenantId,
        serviceId: delivery.serviceId,
        destinationId: delivery.destinationId,
        summary: `${delivery.destinationId} failure rate is ${(delivery.failureRate * 100).toFixed(2)}%.`,
      });
    }
  }

  for (const exportJob of exportSummaries) {
    if (exportJob.status === 'blocked_pending_sla_review') {
      actions.push({
        type: 'export_hold',
        priority: 'high',
        tenantId: exportJob.tenantId,
        serviceId: exportJob.serviceId,
        exportId: exportJob.exportId,
        summary: `${exportJob.exportId} should not be sent until SLA breach evidence is reviewed.`,
      });
    }
  }

  return actions;
}

function buildAdminMetrics(serviceSummaries, webhookSummaries, exportSummaries, actionQueue) {
  return {
    serviceCount: serviceSummaries.length,
    breachedServices: serviceSummaries.filter((service) => service.status === 'breach').length,
    watchServices: serviceSummaries.filter((service) => service.status === 'watch').length,
    healthyServices: serviceSummaries.filter((service) => service.status === 'within_sla').length,
    customerVisibleIncidents: serviceSummaries.reduce((sum, service) => sum + service.customerVisibleIncidents, 0),
    averageMttrMinutes: average(serviceSummaries.map((service) => service.mttrMinutes).filter((value) => value > 0)),
    webhookDestinationsNeedingReview: webhookSummaries.filter((delivery) => delivery.status === 'review_required').length,
    exportsBlocked: exportSummaries.filter((exportJob) => exportJob.status === 'blocked_pending_sla_review').length,
    queuedActions: actionQueue.length,
  };
}

function classifyService({ errorBudgetRemainingMinutes, budgetMinutes, failedCheckRate }) {
  if (errorBudgetRemainingMinutes < 0) {
    return 'breach';
  }
  if (budgetMinutes > 0 && errorBudgetRemainingMinutes <= budgetMinutes * WATCH_BUDGET_RATIO) {
    return 'watch';
  }
  if (failedCheckRate > 0.01) {
    return 'watch';
  }
  return 'within_sla';
}

function digestEvidence(packet, salt) {
  return createHash('sha256')
    .update(canonicalize({ salt, packet }))
    .digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function groupBy(items, key) {
  const groups = new Map();
  for (const item of items) {
    const value = item[key];
    if (!groups.has(value)) {
      groups.set(value, []);
    }
    groups.get(value).push(item);
  }
  return groups;
}

function indexBy(items, key) {
  const index = new Map();
  for (const item of items) {
    index.set(item[key], item);
  }
  return index;
}

function durationMinutes(incident) {
  const started = Date.parse(incident.startedAt);
  const resolved = Date.parse(incident.resolvedAt);
  if (!Number.isFinite(started) || !Number.isFinite(resolved) || resolved < started) {
    return -1;
  }
  return round((resolved - started) / 60000, 2);
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 2);
}

function toRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number >= 1) {
    throw new RangeError(`SLA target must be a decimal between 0 and 1, got ${value}`);
  }
  return number;
}

function toPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function toNonNegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}
