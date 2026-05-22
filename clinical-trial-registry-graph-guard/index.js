'use strict';

const crypto = require('crypto');

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_POLICY = Object.freeze({
  asOfDate: '2026-05-22',
  registryFreshnessDays: 365,
  resultsDueDaysAfterPrimaryCompletion: 365,
  terminalStatuses: ['terminated', 'withdrawn', 'suspended'],
  completedStatuses: ['completed'],
  protocolRequiredPhases: ['phase_2', 'phase_3', 'phase_4'],
  recommendationRelations: ['recommends_followup', 'recommends_related_trial'],
  publicationRelations: ['reports_outcome', 'cites_trial'],
  datasetRelations: ['shares_dataset'],
  protocolRelations: ['uses_protocol']
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

function toDate(dateValue, fieldName) {
  const parsed = new Date(`${dateValue}T00:00:00Z`);
  if (!dateValue || Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${dateValue}`);
  }
  return parsed;
}

function daysBetween(startDate, endDate) {
  return Math.floor((toDate(endDate, 'endDate') - toDate(startDate, 'startDate')) / DAY_MS);
}

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeRegistryId(value, explicitRegistry) {
  const original = String(value || '').trim();
  const registryHint = normalizeToken(explicitRegistry);
  const compact = original.toUpperCase().replace(/\s+/g, '').replace(/^CTGOV:/, '');
  const noHyphen = compact.replace(/-/g, '');

  if (/^NCT\d{8}$/.test(noHyphen)) {
    const registryId = `NCT${noHyphen.slice(-8)}`;
    return { original, registry: 'clinicaltrials_gov', registryId, registryKey: `clinicaltrials_gov:${registryId}`, valid: true };
  }

  const isrctn = noHyphen.replace(/^ISRCTN:/, '');
  if (/^ISRCTN\d{8}$/.test(isrctn)) {
    const registryId = `ISRCTN${isrctn.slice(-8)}`;
    return { original, registry: 'isrctn', registryId, registryKey: `isrctn:${registryId}`, valid: true };
  }

  const euctr = compact.replace(/^EUCTR:/, '').replace(/^EUCTR/, '');
  if (/^20\d{2}-\d{6}-\d{2}$/.test(euctr)) {
    return { original, registry: 'euctr', registryId: euctr, registryKey: `euctr:${euctr}`, valid: true };
  }

  const registry = registryHint || 'unknown';
  return {
    original,
    registry,
    registryId: original,
    registryKey: `${registry}:${original || 'missing'}`,
    valid: false,
    reason: 'registry identifier must normalize to NCT########, EUCTR YYYY-NNNNNN-NN, or ISRCTN########'
  };
}

function normalizeStatus(status) {
  return normalizeToken(status || 'unknown');
}

function normalizePhase(phase) {
  return normalizeToken(phase || 'not_applicable');
}

function endpointSet(endpoints) {
  return new Set((endpoints || []).map((endpoint) => normalizeToken(endpoint)).filter(Boolean));
}

function edgeMatchesTrial(edge, trialRegistryKey, lookup) {
  if (edge.sourceRegistryId) {
    return normalizeRegistryId(edge.sourceRegistryId).registryKey === trialRegistryKey;
  }

  const target = lookup.get(edge.targetId);
  if (!target || !target.trialRegistryIds) return false;
  return target.trialRegistryIds.some((registryId) => normalizeRegistryId(registryId).registryKey === trialRegistryKey);
}

function buildLookup(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function getLinkedItems(trial, edgeRelation, items, edges, trialRegistryKey) {
  const lookup = buildLookup(items);
  const idsFromTrial = new Set((trial.linkedArtifacts || [])
    .filter((artifact) => artifact.relation === edgeRelation)
    .map((artifact) => artifact.id));
  const idsFromEdges = new Set((edges || [])
    .filter((edge) => edge.relation === edgeRelation && edgeMatchesTrial(edge, trialRegistryKey, lookup))
    .map((edge) => edge.targetId));

  return [...new Set([...idsFromTrial, ...idsFromEdges])]
    .map((id) => lookup.get(id))
    .filter(Boolean);
}

function hasRecommendationEdge(trial, edges, trialRegistryKey) {
  return (edges || []).some((edge) => (
    DEFAULT_POLICY.recommendationRelations.includes(edge.relation)
    && edgeMatchesTrial(edge, trialRegistryKey, buildLookup([]))
  )) || (trial.recommendations || []).length > 0;
}

function addIssue(issues, code, severity, message, curatorAction) {
  issues.push({ code, severity, message, curatorAction });
}

function evaluateTrial(trial, graph = {}, options = {}) {
  const policy = Object.assign({}, DEFAULT_POLICY, options.policy || {}, {
    asOfDate: options.asOfDate || (options.policy && options.policy.asOfDate) || DEFAULT_POLICY.asOfDate
  });
  toDate(policy.asOfDate, 'asOfDate');

  const normalized = normalizeRegistryId(trial.registryId, trial.registry);
  const status = normalizeStatus(trial.status);
  const phase = normalizePhase(trial.phase);
  const issues = [];
  const edges = graph.edges || [];
  const recommendationsPresent = hasRecommendationEdge(trial, edges, normalized.registryKey);

  if (!normalized.valid) {
    addIssue(
      issues,
      'invalid_registry_id',
      'critical',
      normalized.reason,
      'replace graph node identifier with a canonical trial registry ID before showing clinical edges'
    );
  }

  if (trial.registryUpdatedAt) {
    const ageDays = daysBetween(trial.registryUpdatedAt, policy.asOfDate);
    if (ageDays < 0 || ageDays > policy.registryFreshnessDays) {
      addIssue(
        issues,
        'stale_registry_record',
        'medium',
        `registry evidence is ${ageDays} days old`,
        'refresh registry metadata snapshot and recompute trial graph edge safety'
      );
    }
  } else {
    addIssue(
      issues,
      'missing_registry_update_date',
      'medium',
      'registry evidence is missing an update date',
      'attach registry snapshot date before surfacing trial graph recommendations'
    );
  }

  if (policy.terminalStatuses.includes(status) && recommendationsPresent) {
    addIssue(
      issues,
      'terminal_trial_recommended',
      'critical',
      `trial status ${trial.status} must not drive active clinical recommendations`,
      'suppress recommendation cards and route the trial edge to curator review'
    );
  }

  if (policy.completedStatuses.includes(status) && trial.primaryCompletionDate) {
    const daysSincePrimaryCompletion = daysBetween(trial.primaryCompletionDate, policy.asOfDate);
    const resultsPosted = Boolean(trial.resultsPostedDate);
    if (daysSincePrimaryCompletion > policy.resultsDueDaysAfterPrimaryCompletion && !resultsPosted) {
      const severity = recommendationsPresent ? 'critical' : 'high';
      addIssue(
        issues,
        'results_posting_overdue',
        severity,
        `primary completion was ${daysSincePrimaryCompletion} days ago and no results-posting date is attached`,
        'hold outcome and recommendation edges until results-posting evidence or an exemption is attached'
      );
    }
  }

  const protocolItems = getLinkedItems(trial, 'uses_protocol', graph.protocols, edges, normalized.registryKey);
  if (policy.protocolRequiredPhases.includes(phase) && protocolItems.length === 0) {
    addIssue(
      issues,
      'missing_protocol_edge',
      'high',
      `${trial.phase} trial has no linked protocol artifact`,
      'link the registered protocol before allowing publication or dataset graph edges'
    );
  }

  const publicationItems = getLinkedItems(trial, 'reports_outcome', graph.publications, edges, normalized.registryKey);
  const declaredEndpoints = endpointSet(trial.primaryEndpoints);
  for (const publication of publicationItems) {
    const publicationRegistryKeys = (publication.trialRegistryIds || []).map((id) => normalizeRegistryId(id).registryKey);
    if (!publicationRegistryKeys.includes(normalized.registryKey)) {
      addIssue(
        issues,
        'publication_registry_mismatch',
        'high',
        `publication ${publication.id} does not cite ${normalized.registryId}`,
        'require publication trial ID evidence before displaying the outcome edge'
      );
    }

    const reportedEndpoints = endpointSet(publication.reportedEndpoints);
    for (const endpoint of reportedEndpoints) {
      if (!declaredEndpoints.has(endpoint)) {
        addIssue(
          issues,
          'endpoint_mismatch',
          'high',
          `publication ${publication.id} reports undeclared endpoint ${endpoint}`,
          'map the reported endpoint to a registered primary endpoint or mark the edge as exploratory'
        );
      }
    }
  }

  const datasetItems = getLinkedItems(trial, 'shares_dataset', graph.datasets, edges, normalized.registryKey);
  for (const dataset of datasetItems) {
    const datasetKey = normalizeRegistryId(dataset.trialRegistryId).registryKey;
    if (datasetKey !== normalized.registryKey) {
      addIssue(
        issues,
        'dataset_registry_mismatch',
        'high',
        `dataset ${dataset.id} links to ${dataset.trialRegistryId || 'no trial ID'}`,
        'detach dataset edge until registry provenance matches the trial node'
      );
    }

    if (!dataset.accession || dataset.accessStatus === 'unknown') {
      addIssue(
        issues,
        'dataset_accession_missing',
        'medium',
        `dataset ${dataset.id} is missing a stable accession or access status`,
        'attach repository accession and access state before recommendation use'
      );
    }
  }

  const action = selectAction(issues);
  const packet = {
    trialId: trial.id,
    registry: normalized.registry,
    registryId: normalized.registryId,
    registryKey: normalized.registryKey,
    registryIdValid: normalized.valid,
    status,
    phase,
    action: action.action,
    severity: action.severity,
    reason: action.reason,
    recommendationEdgesPresent: recommendationsPresent,
    linkedPublicationCount: publicationItems.length,
    linkedDatasetCount: datasetItems.length,
    linkedProtocolCount: protocolItems.length,
    issueCount: issues.length,
    issues,
    curatorActions: [...new Set(issues.map((issue) => issue.curatorAction))],
    policySnapshot: {
      asOfDate: policy.asOfDate,
      registryFreshnessDays: policy.registryFreshnessDays,
      resultsDueDaysAfterPrimaryCompletion: policy.resultsDueDaysAfterPrimaryCompletion
    }
  };

  packet.auditDigest = digest(Object.assign({}, packet, { auditDigest: undefined }));
  return packet;
}

function selectAction(issues) {
  if (issues.some((issue) => issue.severity === 'critical')) {
    return {
      action: 'suppress_clinical_recommendations',
      severity: 'critical',
      reason: 'critical trial registry integrity issue affects recommendation safety'
    };
  }

  if (issues.some((issue) => issue.severity === 'high')) {
    return {
      action: 'hold_edges_for_curator_review',
      severity: 'high',
      reason: 'trial graph edges need curator review before publication or discovery use'
    };
  }

  if (issues.some((issue) => issue.severity === 'medium')) {
    return {
      action: 'warn_registry_refresh',
      severity: 'medium',
      reason: 'registry evidence should be refreshed before graph promotion'
    };
  }

  return {
    action: 'allow_trial_graph_edges',
    severity: 'low',
    reason: 'registry identifiers, linked artifacts, and recommendation evidence satisfy policy'
  };
}

function evaluateGraph(graph, options = {}) {
  const packets = (graph.trials || []).map((trial) => evaluateTrial(trial, graph, options));
  const summary = packets.reduce((acc, packet) => {
    acc.byAction[packet.action] = (acc.byAction[packet.action] || 0) + 1;
    acc.bySeverity[packet.severity] = (acc.bySeverity[packet.severity] || 0) + 1;
    if (packet.severity === 'critical' || packet.severity === 'high') {
      acc.heldTrials.push(packet.registryId);
    }
    acc.curatorActionCount += packet.curatorActions.length;
    return acc;
  }, {
    byAction: {},
    bySeverity: {},
    heldTrials: [],
    curatorActionCount: 0
  });

  const portfolio = {
    asOfDate: options.asOfDate || DEFAULT_POLICY.asOfDate,
    trialCount: packets.length,
    heldTrialCount: summary.heldTrials.length,
    heldTrials: summary.heldTrials,
    curatorActionCount: summary.curatorActionCount,
    byAction: summary.byAction,
    bySeverity: summary.bySeverity,
    packets
  };

  portfolio.auditDigest = digest(portfolio);
  return portfolio;
}

module.exports = {
  DEFAULT_POLICY,
  daysBetween,
  digest,
  evaluateGraph,
  evaluateTrial,
  normalizeRegistryId
};
