'use strict';

const crypto = require('node:crypto');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value, fieldName = 'date') {
  if (!value) {
    throw new Error(`Missing ${fieldName}`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }

  return date;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function daysUntil(target, now) {
  return Math.ceil((target.getTime() - now.getTime()) / MS_PER_DAY);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function buildPolicyMap(policies) {
  return new Map(policies.map((policy) => [policy.dataClass, policy]));
}

function hasIntersection(left = [], right = []) {
  const rightValues = new Set(right);
  return left.some((value) => rightValues.has(value));
}

function isHoldActive(hold, now) {
  if (hold.status !== 'active') {
    return false;
  }

  if (!hold.expiresOn) {
    return true;
  }

  return parseDate(hold.expiresOn, `legal hold ${hold.id} expiry`) >= now;
}

function holdAppliesToRecord(hold, record, now) {
  if (!isHoldActive(hold, now)) {
    return false;
  }

  return (
    (hold.recordIds || []).includes(record.id) ||
    (hold.projectIds || []).includes(record.projectId) ||
    hasIntersection(hold.funderTags || [], record.funderTags || [])
  );
}

function retentionDeadline(record, policy) {
  const clockField = policy.clock || 'createdAt';
  const clockValue = record[clockField] || record.createdAt;
  return addDays(parseDate(clockValue, `${record.id}.${clockField}`), policy.retainDays);
}

function createAction(type, severity, record, fields = {}) {
  return {
    id: `${type}:${record.id}`,
    type,
    severity,
    recordId: record.id,
    projectId: record.projectId,
    department: record.department,
    owner: fields.owner || 'Research Operations',
    summary: fields.summary,
    dueOn: fields.dueOn,
    blockers: fields.blockers || [],
    evidence: fields.evidence || []
  };
}

function createWebhookEvent(type, payload, issuedAt) {
  const envelope = {
    type,
    version: '2026-05-enterprise-retention',
    issuedAt,
    payload
  };

  return {
    ...envelope,
    digest: digest(envelope)
  };
}

function evaluateRecord(record, policy, activeHolds, now) {
  const actions = [];
  const holdIds = activeHolds.map((hold) => hold.id);
  const issuedAt = now.toISOString();
  const events = [];
  const exportLocks = [];

  if (!policy) {
    actions.push(createAction('classify_retention_policy', 'high', record, {
      owner: 'Research Compliance',
      dueOn: toIsoDate(addDays(now, 7)),
      summary: `No retention policy is mapped for ${record.dataClass}.`,
      evidence: [`dataClass=${record.dataClass}`]
    }));

    events.push(createWebhookEvent('retention.policy_missing', {
      recordId: record.id,
      projectId: record.projectId,
      dataClass: record.dataClass
    }, issuedAt));

    return {
      recordId: record.id,
      status: 'policy_missing',
      holdIds,
      actions,
      exportLocks,
      events
    };
  }

  const deadline = retentionDeadline(record, policy);
  const remainingDays = daysUntil(deadline, now);
  const expired = remainingDays < 0;
  const inReviewWindow = remainingDays >= 0 && remainingDays <= policy.reviewBeforeDays;

  if (holdIds.length > 0) {
    actions.push(createAction('preserve_under_legal_hold', 'critical', record, {
      owner: activeHolds[0].owner || 'Office of General Counsel',
      dueOn: toIsoDate(now),
      summary: `Preserve record under active legal hold ${holdIds.join(', ')}.`,
      blockers: ['purge', 'destructive_export_sync'],
      evidence: holdIds
    }));

    exportLocks.push({
      recordId: record.id,
      exportId: record.latestExportId || null,
      reason: 'active_legal_hold',
      holdIds,
      lockedSystems: ['repository_export', 'funder_portal_sync', 'bulk_download']
    });

    events.push(createWebhookEvent('retention.legal_hold_applied', {
      recordId: record.id,
      projectId: record.projectId,
      holdIds
    }, issuedAt));
  }

  if (expired && holdIds.length > 0) {
    actions.push(createAction('purge_blocked_by_hold', 'critical', record, {
      owner: activeHolds[0].owner || policy.owner,
      dueOn: toIsoDate(now),
      summary: `Retention expired ${Math.abs(remainingDays)} days ago, but purge is blocked by legal hold.`,
      blockers: holdIds,
      evidence: [`deadline=${toIsoDate(deadline)}`]
    }));
  } else if (expired) {
    actions.push(createAction('purge_due', 'high', record, {
      owner: policy.owner,
      dueOn: toIsoDate(addDays(now, 14)),
      summary: `Retention expired ${Math.abs(remainingDays)} days ago and no active hold blocks purge.`,
      evidence: [`deadline=${toIsoDate(deadline)}`]
    }));

    events.push(createWebhookEvent('retention.purge_due', {
      recordId: record.id,
      projectId: record.projectId,
      deadline: toIsoDate(deadline)
    }, issuedAt));
  } else if (inReviewWindow) {
    actions.push(createAction('retention_review_due', 'medium', record, {
      owner: policy.owner,
      dueOn: toIsoDate(deadline),
      summary: `Retention deadline is ${remainingDays} days away.`,
      evidence: [`deadline=${toIsoDate(deadline)}`, `reviewBeforeDays=${policy.reviewBeforeDays}`]
    }));
  }

  if (policy.requiresLegalReview && holdIds.length === 0) {
    actions.push(createAction('legal_review_before_export', 'medium', record, {
      owner: 'Research Compliance',
      dueOn: toIsoDate(addDays(now, 30)),
      summary: 'Controlled data requires legal review before any repository or funder export.',
      blockers: ['repository_export', 'funder_portal_sync'],
      evidence: [`dataClass=${record.dataClass}`]
    }));
  }

  if (policy.openAccessRequired && record.openAccessStatus !== 'compliant') {
    actions.push(createAction('open_access_evidence_required', 'medium', record, {
      owner: policy.owner,
      dueOn: toIsoDate(addDays(now, 21)),
      summary: `Open-access evidence is ${record.openAccessStatus}; funder export should wait for confirmation.`,
      blockers: ['funder_final_report'],
      evidence: [`openAccessStatus=${record.openAccessStatus}`]
    }));
  }

  return {
    recordId: record.id,
    status: chooseRecordStatus(actions),
    deadline: toIsoDate(deadline),
    daysUntilDeadline: remainingDays,
    holdIds,
    actions,
    exportLocks,
    events
  };
}

function chooseRecordStatus(actions) {
  if (actions.some((action) => action.severity === 'critical')) {
    return 'blocked';
  }

  if (actions.some((action) => action.severity === 'high')) {
    return 'action_required';
  }

  if (actions.some((action) => action.severity === 'medium')) {
    return 'review_required';
  }

  return 'clear';
}

function groupCounts(items, keySelector) {
  return items.reduce((counts, item) => {
    const key = keySelector(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function buildDashboardMetrics(records, evaluations, actions, exportLocks) {
  return {
    byDepartment: groupCounts(actions, (action) => action.department),
    bySeverity: groupCounts(actions, (action) => action.severity),
    byDataClass: groupCounts(records, (record) => record.dataClass),
    actionOwners: groupCounts(actions, (action) => action.owner),
    exportLocks: exportLocks.length,
    affectedProjects: unique(actions.map((action) => action.projectId)).length,
    clearRecords: evaluations.filter((evaluation) => evaluation.status === 'clear').length
  };
}

function summarizeStatus(actions) {
  if (actions.some((action) => action.severity === 'critical')) {
    return 'legal_hold_controls_required';
  }

  if (actions.length > 0) {
    return 'human_review_required';
  }

  return 'clear';
}

function buildRetentionPlan(input, options = {}) {
  const now = options.now ? parseDate(options.now.slice(0, 10), 'options.now') : new Date();
  const policies = input.policies || [];
  const records = input.records || [];
  const legalHolds = input.legalHolds || [];
  const policyMap = buildPolicyMap(policies);

  const evaluations = records.map((record) => {
    const activeHolds = legalHolds.filter((hold) => holdAppliesToRecord(hold, record, now));
    return evaluateRecord(record, policyMap.get(record.dataClass), activeHolds, now);
  });

  const actions = evaluations.flatMap((evaluation) => evaluation.actions);
  const exportLocks = evaluations.flatMap((evaluation) => evaluation.exportLocks);
  const webhookEvents = evaluations.flatMap((evaluation) => evaluation.events);
  const purgeQueue = actions
    .filter((action) => action.type === 'purge_due')
    .map((action) => ({
      recordId: action.recordId,
      projectId: action.projectId,
      owner: action.owner,
      dueOn: action.dueOn,
      evidence: action.evidence
    }));

  const summary = {
    evaluatedAt: now.toISOString(),
    institutionId: input.institution && input.institution.id,
    totalRecords: records.length,
    actions: actions.length,
    criticalActions: actions.filter((action) => action.severity === 'critical').length,
    purgeQueue: purgeQueue.length,
    exportLocks: exportLocks.length,
    legalHoldRecords: evaluations.filter((evaluation) => evaluation.holdIds.length > 0).length,
    missingPolicies: actions.filter((action) => action.type === 'classify_retention_policy').length,
    status: summarizeStatus(actions)
  };

  const dashboardMetrics = buildDashboardMetrics(records, evaluations, actions, exportLocks);
  const exportManifest = buildExportManifest(input, evaluations, actions, exportLocks, now);

  return {
    summary,
    evaluations,
    actions,
    purgeQueue,
    exportLocks,
    dashboardMetrics,
    webhookEvents,
    exportManifest
  };
}

function buildExportManifest(input, evaluations, actions, exportLocks, now) {
  const lockedRecordIds = new Set(exportLocks.map((lock) => lock.recordId));
  const actionMap = new Map();

  for (const action of actions) {
    if (!actionMap.has(action.recordId)) {
      actionMap.set(action.recordId, []);
    }
    actionMap.get(action.recordId).push(action.type);
  }

  const records = (input.records || []).map((record) => {
    const blockers = actionMap.get(record.id) || [];
    const exportDecision = lockedRecordIds.has(record.id)
      ? 'blocked'
      : blockers.length > 0
        ? 'review'
        : 'ready';

    return {
      recordId: record.id,
      projectId: record.projectId,
      dataClass: record.dataClass,
      exportDecision,
      blockers,
      manifestDigest: digest({
        recordId: record.id,
        projectId: record.projectId,
        dataClass: record.dataClass,
        blockers
      })
    };
  });

  return {
    generatedAt: now.toISOString(),
    institutionId: input.institution && input.institution.id,
    records,
    digest: digest(records)
  };
}

module.exports = {
  buildRetentionPlan,
  createWebhookEvent,
  stableStringify,
  digest
};
