'use strict';

const crypto = require('crypto');

const DEFAULT_POLICY = Object.freeze({
  asOfDate: '2026-05-22',
  criticalSeverities: ['critical', 'high'],
  urgentCategories: ['compliance_deadline', 'security_integration', 'export_failure', 'irb_risk'],
  maxDigestDelayHours: 4,
  maxWebhookFailureRate: 0.15,
  maxDuplicateWindowHours: 24,
  quietHoursOverrideSeverities: ['critical', 'high']
});

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function addFinding(findings, code, severity, message, remediation) {
  findings.push({ code, severity, message, remediation });
}

function hoursUntil(dueAt, asOfDate) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const asOf = new Date(`${asOfDate}T00:00:00Z`);
  if (Number.isNaN(due.getTime())) throw new Error(`Invalid dueAt: ${dueAt}`);
  return Math.round((due.getTime() - asOf.getTime()) / (60 * 60 * 1000));
}

function evaluateAlert(alert, options = {}) {
  const policy = Object.assign({}, DEFAULT_POLICY, options.policy || {}, {
    asOfDate: options.asOfDate || (options.policy && options.policy.asOfDate) || DEFAULT_POLICY.asOfDate
  });
  const severity = normalizeToken(alert.severity || 'low');
  const category = normalizeToken(alert.category || 'general');
  const routing = alert.routing || {};
  const owner = alert.owner || {};
  const webhook = alert.webhook || {};
  const digestSettings = routing.digest || {};
  const findings = [];
  const urgent = policy.criticalSeverities.includes(severity) || policy.urgentCategories.includes(category);
  const dueInHours = hoursUntil(alert.dueAt, policy.asOfDate);

  if (urgent && digestSettings.enabled && Number(digestSettings.delayHours || 0) > policy.maxDigestDelayHours) {
    addFinding(
      findings,
      'urgent_alert_delayed_by_digest',
      'critical',
      `${alert.id} is urgent but digest delay is ${digestSettings.delayHours} hours`,
      'bypass digest and deliver immediately to primary plus escalation owners'
    );
  }

  if (urgent && routing.muted === true) {
    addFinding(
      findings,
      'urgent_alert_muted',
      'critical',
      `${alert.id} is urgent but owner preferences mute the route`,
      'override mute for compliance-critical alert and log preference bypass'
    );
  }

  if (routing.quietHours === true && policy.quietHoursOverrideSeverities.includes(severity)) {
    addFinding(
      findings,
      'quiet_hours_override_required',
      severity === 'critical' ? 'critical' : 'high',
      `${alert.id} falls in quiet hours but severity is ${severity}`,
      'use emergency channel and record quiet-hours override justification'
    );
  }

  if (owner.active === false || owner.onLeave === true) {
    addFinding(
      findings,
      'inactive_owner_route',
      'high',
      `${alert.id} is routed to inactive or unavailable owner ${owner.id || 'unknown'}`,
      'route to delegated owner group and update dashboard ownership metadata'
    );
  }

  if (webhook.required && Number(webhook.failureRate || 0) > policy.maxWebhookFailureRate) {
    addFinding(
      findings,
      'webhook_health_fallback_required',
      urgent ? 'high' : 'medium',
      `${alert.id} webhook failure rate ${(Number(webhook.failureRate) * 100).toFixed(1)}% exceeds policy`,
      'fallback to admin inbox and include webhook repair action in the packet'
    );
  }

  if (routing.duplicateSuppressed === true && dueInHours !== null && dueInHours <= policy.maxDuplicateWindowHours) {
    addFinding(
      findings,
      'duplicate_suppression_near_deadline',
      'high',
      `${alert.id} is deduplicated with ${dueInHours} hours before deadline`,
      'show one canonical alert and keep deadline badge visible until acknowledged'
    );
  }

  if (!routing.channels || routing.channels.length === 0) {
    addFinding(
      findings,
      'missing_delivery_channel',
      urgent ? 'high' : 'medium',
      `${alert.id} has no delivery channel`,
      'assign admin inbox channel and require owner acknowledgement'
    );
  }

  const selected = selectAction(findings);
  const packet = {
    alertId: alert.id,
    category,
    severity,
    dueInHours,
    urgent,
    action: selected.action,
    decisionSeverity: selected.severity,
    reason: selected.reason,
    ownerId: owner.id || null,
    routedChannels: routing.channels || [],
    webhookRequired: Boolean(webhook.required),
    findingCount: findings.length,
    findings,
    dashboardBadges: buildDashboardBadges(alert, findings),
    webhookEvent: buildWebhookEvent(alert, selected, findings)
  };

  packet.auditDigest = digest(Object.assign({}, packet, { auditDigest: undefined }));
  return packet;
}

function selectAction(findings) {
  if (findings.some((finding) => finding.severity === 'critical')) {
    return {
      action: 'deliver_now_and_escalate',
      severity: 'critical',
      reason: 'urgent enterprise alert would otherwise be muted, delayed, or hidden'
    };
  }

  if (findings.some((finding) => finding.severity === 'high')) {
    return {
      action: 'hold_digest_and_route_owner_fallback',
      severity: 'high',
      reason: 'alert requires owner fallback or visible escalation before digesting'
    };
  }

  if (findings.some((finding) => finding.severity === 'medium')) {
    return {
      action: 'warn_and_repair_delivery_path',
      severity: 'medium',
      reason: 'delivery path should be repaired while alert remains visible'
    };
  }

  return {
    action: 'allow_digest_or_standard_delivery',
    severity: 'low',
    reason: 'alert routing satisfies admin notification policy'
  };
}

function buildDashboardBadges(alert, findings) {
  const badges = [];
  if (findings.some((finding) => finding.code.includes('digest') || finding.code.includes('muted'))) badges.push('bypass-digest');
  if (findings.some((finding) => finding.code.includes('owner'))) badges.push('owner-fallback');
  if (findings.some((finding) => finding.code.includes('webhook'))) badges.push('webhook-fallback');
  if (findings.some((finding) => finding.code.includes('deadline'))) badges.push('deadline-visible');
  if (badges.length === 0 && normalizeToken(alert.severity) === 'low') badges.push('standard-delivery');
  return badges;
}

function buildWebhookEvent(alert, selected, findings) {
  return {
    eventType: 'enterprise.alert.routing.reviewed',
    alertId: alert.id,
    action: selected.action,
    findingCodes: findings.map((finding) => finding.code),
    requiresAcknowledgement: selected.severity === 'critical' || selected.severity === 'high',
    eventDigest: digest({
      alertId: alert.id,
      action: selected.action,
      findingCodes: findings.map((finding) => finding.code)
    })
  };
}

function evaluateAlerts(alerts, options = {}) {
  const packets = alerts.map((alert) => evaluateAlert(alert, options));
  const summary = packets.reduce((acc, packet) => {
    acc.byAction[packet.action] = (acc.byAction[packet.action] || 0) + 1;
    acc.bySeverity[packet.decisionSeverity] = (acc.bySeverity[packet.decisionSeverity] || 0) + 1;
    if (packet.decisionSeverity === 'critical' || packet.decisionSeverity === 'high') acc.escalatedAlerts.push(packet.alertId);
    acc.findingCount += packet.findingCount;
    return acc;
  }, {
    byAction: {},
    bySeverity: {},
    escalatedAlerts: [],
    findingCount: 0
  });

  const portfolio = {
    asOfDate: options.asOfDate || DEFAULT_POLICY.asOfDate,
    alertCount: packets.length,
    findingCount: summary.findingCount,
    escalatedAlerts: summary.escalatedAlerts,
    byAction: summary.byAction,
    bySeverity: summary.bySeverity,
    packets
  };

  portfolio.auditDigest = digest(portfolio);
  return portfolio;
}

module.exports = {
  DEFAULT_POLICY,
  digest,
  evaluateAlert,
  evaluateAlerts,
  hoursUntil
};
