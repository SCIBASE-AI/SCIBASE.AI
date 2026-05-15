const DEFAULT_POLICY = Object.freeze({
  minConsentCoveragePct: 95,
  minSubjectCount: 50,
  minKAnonymity: 8,
  minInstitutions: 3,
  minAggregationWindowDays: 7,
  allowedPurposes: new Set([
    'policy-planning',
    'meta-research',
    'market-intelligence',
    'funder-portfolio-analysis',
    'white-label-insights',
  ]),
  forbiddenFields: new Set([
    'email',
    'full_name',
    'name',
    'phone',
    'raw_content',
    'project_body',
    'notebook_source',
    'payment_token',
    'bank_account',
    'tax_id',
    'api_key',
    'access_token',
  ]),
  allowedChannels: ['analytics-dashboard', 'licensed-api', 'white-label-export'],
});

function normalizePolicy(policy = {}) {
  return {
    ...DEFAULT_POLICY,
    ...policy,
    allowedPurposes: new Set(policy.allowedPurposes ?? DEFAULT_POLICY.allowedPurposes),
    forbiddenFields: new Set(policy.forbiddenFields ?? DEFAULT_POLICY.forbiddenFields),
    allowedChannels: [...(policy.allowedChannels ?? DEFAULT_POLICY.allowedChannels)],
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function asNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function addCheck(checks, code, passed, message, action) {
  checks.push({
    code,
    status: passed ? 'pass' : 'hold',
    message,
    action: passed ? 'No action needed.' : action,
  });
}

export function evaluatePackage(candidatePackage, policyInput = {}) {
  const policy = normalizePolicy(policyInput);
  const fields = unique(candidatePackage.fields ?? []);
  const forbiddenFields = fields.filter((field) => policy.forbiddenFields.has(field));
  const checks = [];

  addCheck(
    checks,
    'no-private-content',
    !candidatePackage.privateContentIncluded,
    'Private project content is not allowed in licensed analytics exports.',
    'Remove private project content and regenerate the analytics package from aggregated metadata.',
  );

  addCheck(
    checks,
    'no-direct-identifiers',
    !candidatePackage.directIdentifiersPresent && forbiddenFields.length === 0,
    'Direct identifiers and blocked fields are not allowed in licensed exports.',
    `Remove or aggregate blocked fields: ${forbiddenFields.join(', ') || 'direct identifiers'}.`,
  );

  const consentCoveragePct = asNumber(candidatePackage.consentCoveragePct);
  addCheck(
    checks,
    'consent-coverage',
    consentCoveragePct >= policy.minConsentCoveragePct,
    `Consent coverage is ${consentCoveragePct}%; minimum is ${policy.minConsentCoveragePct}%.`,
    `Raise consent coverage to at least ${policy.minConsentCoveragePct}%.`,
  );

  const subjectCount = asNumber(candidatePackage.subjectCount);
  addCheck(
    checks,
    'aggregation-subjects',
    subjectCount >= policy.minSubjectCount,
    `Package subject count is ${subjectCount}; minimum is ${policy.minSubjectCount}.`,
    `Increase aggregation to at least ${policy.minSubjectCount} subjects before licensing.`,
  );

  const institutionCount = asNumber(candidatePackage.institutionCount);
  addCheck(
    checks,
    'institution-diversity',
    institutionCount >= policy.minInstitutions,
    `Institution count is ${institutionCount}; minimum is ${policy.minInstitutions}.`,
    `Add data from at least ${policy.minInstitutions} institutions or hold for internal analysis only.`,
  );

  const kAnonymity = asNumber(candidatePackage.kAnonymity);
  addCheck(
    checks,
    'k-anonymity',
    kAnonymity >= policy.minKAnonymity,
    `K-anonymity is ${kAnonymity}; minimum is ${policy.minKAnonymity}.`,
    `Suppress or generalize cohorts until k-anonymity is at least ${policy.minKAnonymity}.`,
  );

  const aggregationWindowDays = asNumber(candidatePackage.aggregationWindowDays);
  addCheck(
    checks,
    'aggregation-window',
    aggregationWindowDays >= policy.minAggregationWindowDays,
    `Aggregation window is ${aggregationWindowDays} days; minimum is ${policy.minAggregationWindowDays}.`,
    `Extend the aggregation window to at least ${policy.minAggregationWindowDays} days.`,
  );

  addCheck(
    checks,
    'approved-purpose',
    policy.allowedPurposes.has(candidatePackage.licensingPurpose),
    'Licensing purpose is approved for anonymized analytics revenue.',
    `Use an approved purpose: ${[...policy.allowedPurposes].join(', ')}.`,
  );

  const holdReasons = checks.filter((check) => check.status === 'hold');
  const ready = holdReasons.length === 0;
  const estimatedMonthlyRevenue = ready ? asNumber(candidatePackage.estimatedMonthlyRevenue) : 0;

  return {
    id: candidatePackage.id,
    name: candidatePackage.name,
    customerSegment: candidatePackage.customerSegment,
    licensingPurpose: candidatePackage.licensingPurpose,
    status: ready ? 'ready' : 'hold',
    revenueRecognition: ready ? 'eligible' : 'blocked',
    estimatedMonthlyRevenue,
    allowedChannels: ready ? policy.allowedChannels : [],
    blockedFields: forbiddenFields,
    checks,
    recommendedHoldActions: holdReasons.map((check) => check.action),
  };
}

export function buildLicensingReadinessReport(candidatePackages, policyInput = {}) {
  const decisions = candidatePackages.map((candidatePackage) => evaluatePackage(candidatePackage, policyInput));
  const readyPackages = decisions.filter((decision) => decision.status === 'ready');
  const heldPackages = decisions.filter((decision) => decision.status === 'hold');
  const eligibleMonthlyRevenue = readyPackages.reduce((sum, decision) => sum + decision.estimatedMonthlyRevenue, 0);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      packageCount: decisions.length,
      readyCount: readyPackages.length,
      holdCount: heldPackages.length,
      eligibleMonthlyRevenue,
    },
    decisions,
    nextActions: summarizeNextActions(heldPackages),
  };
}

export function summarizeNextActions(heldPackages) {
  const actionCounts = new Map();

  for (const heldPackage of heldPackages) {
    for (const action of heldPackage.recommendedHoldActions) {
      actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
    }
  }

  return [...actionCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([action, count]) => ({action, count}));
}

export const samplePackages = Object.freeze([
  {
    id: 'lic-api-nih-trends',
    name: 'NIH-aligned methods trend index',
    customerSegment: 'government-agency',
    licensingPurpose: 'policy-planning',
    fields: ['topic_cluster', 'method_family', 'dataset_reuse_count', 'reproducibility_score'],
    privateContentIncluded: false,
    directIdentifiersPresent: false,
    consentCoveragePct: 99,
    subjectCount: 2200,
    institutionCount: 18,
    kAnonymity: 35,
    aggregationWindowDays: 30,
    estimatedMonthlyRevenue: 4200,
  },
  {
    id: 'lic-dashboard-private-notes',
    name: 'Reviewer note intelligence preview',
    customerSegment: 'market-intelligence',
    licensingPurpose: 'market-intelligence',
    fields: ['topic_cluster', 'raw_content', 'reviewer_email'],
    privateContentIncluded: true,
    directIdentifiersPresent: true,
    consentCoveragePct: 84,
    subjectCount: 42,
    institutionCount: 2,
    kAnonymity: 3,
    aggregationWindowDays: 3,
    estimatedMonthlyRevenue: 1800,
  },
  {
    id: 'lic-white-label-consortium',
    name: 'Consortium reproducibility benchmark',
    customerSegment: 'academic-consortium',
    licensingPurpose: 'white-label-insights',
    fields: ['discipline', 'tool_family', 'execution_success_rate', 'dataset_reuse_count'],
    privateContentIncluded: false,
    directIdentifiersPresent: false,
    consentCoveragePct: 97,
    subjectCount: 680,
    institutionCount: 9,
    kAnonymity: 16,
    aggregationWindowDays: 14,
    estimatedMonthlyRevenue: 2500,
  },
]);
