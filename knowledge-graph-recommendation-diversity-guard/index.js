const crypto = require('crypto');

const DEFAULT_POLICY = {
  minRecommendations: 5,
  minRationaleEdges: 2,
  maxInstitutionShare: 0.5,
  maxFunderShare: 0.5,
  maxDomainShare: 0.7,
  maxMethodShare: 0.5,
  maxTopCitationShare: 0.6,
  maxStaleEvidenceShare: 0.4,
  staleEvidenceBeforeYear: 2023,
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function ratio(count, total) {
  return total === 0 ? 0 : Number((count / total).toFixed(3));
}

function topShare(items, field) {
  const counts = new Map();
  for (const item of items) {
    const value = item[field] || 'unknown';
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [value, count] = sorted[0] || ['none', 0];
  return {
    field,
    value,
    count,
    share: ratio(count, items.length),
  };
}

function citationShare(items) {
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.citations || 0)), 0);
  const top = items.reduce((winner, item) => (Number(item.citations || 0) > Number(winner.citations || 0) ? item : winner), items[0] || {});
  return {
    id: top.id || 'none',
    citations: Number(top.citations || 0),
    share: total === 0 ? 0 : Number((Number(top.citations || 0) / total).toFixed(3)),
  };
}

function evaluateRecommendation(item, policy) {
  const blockers = [];
  const warnings = [];
  const actions = [];
  const rationaleEdges = asArray(item.rationaleEdges);

  if (rationaleEdges.length < policy.minRationaleEdges) {
    blockers.push('insufficient_rationale_edges');
    actions.push('add_explainable_graph_path');
  }

  if (!item.institution) {
    warnings.push('institution_missing');
    actions.push('add_institution_metadata');
  }

  if (!item.funder) {
    warnings.push('funder_missing');
    actions.push('add_funder_metadata');
  }

  if (!item.method) {
    warnings.push('method_missing');
    actions.push('add_method_metadata');
  }

  if (Number(item.evidenceYear || 0) < policy.staleEvidenceBeforeYear) {
    warnings.push('stale_evidence');
    actions.push('refresh_or_label_evidence_age');
  }

  if (item.suppressed === true) {
    blockers.push('already_suppressed_source');
    actions.push('replace_suppressed_source');
  }

  return {
    id: item.id,
    title: item.title,
    domain: item.domain,
    institution: item.institution,
    funder: item.funder,
    method: item.method,
    status: blockers.length ? 'hold' : warnings.length ? 'warn' : 'show',
    blockers,
    warnings,
    actions: unique(actions),
  };
}

function evaluateRecommendationDiversity(input) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) };
  const recommendationSet = input.recommendationSet || {};
  const recommendations = asArray(recommendationSet.recommendations);
  const itemResults = recommendations.map((item) => evaluateRecommendation(item, policy));
  const shownItems = recommendations.filter((item) => {
    const result = itemResults.find((candidate) => candidate.id === item.id);
    return result && result.status !== 'hold';
  });
  const blockers = [];
  const warnings = [];
  const actions = [];

  if (shownItems.length < policy.minRecommendations) {
    blockers.push('too_few_showable_recommendations');
    actions.push('add_more_diverse_candidates');
  }

  const concentrationChecks = [
    { metric: 'institution', result: topShare(recommendations, 'institution'), limit: policy.maxInstitutionShare },
    { metric: 'funder', result: topShare(recommendations, 'funder'), limit: policy.maxFunderShare },
    { metric: 'domain', result: topShare(recommendations, 'domain'), limit: policy.maxDomainShare },
    { metric: 'method', result: topShare(recommendations, 'method'), limit: policy.maxMethodShare },
  ];

  for (const check of concentrationChecks) {
    if (check.result.share > check.limit) {
      blockers.push(`${check.metric}_concentration`);
      actions.push(`rebalance_${check.metric}_mix`);
    }
  }

  const citation = citationShare(recommendations);
  if (citation.share > policy.maxTopCitationShare) {
    warnings.push('citation_herd_risk');
    actions.push('add_low_citation_or_recent_counterpoints');
  }

  const staleCount = recommendations.filter((item) => Number(item.evidenceYear || 0) < policy.staleEvidenceBeforeYear).length;
  const staleShare = ratio(staleCount, recommendations.length);
  if (staleShare > policy.maxStaleEvidenceShare) {
    blockers.push('stale_evidence_dominance');
    actions.push('refresh_recommendation_evidence');
  }

  for (const result of itemResults) {
    for (const blocker of result.blockers) {
      blockers.push(`${result.id}_${blocker}`);
    }
    for (const warning of result.warnings) {
      warnings.push(`${result.id}_${warning}`);
    }
    for (const action of result.actions) {
      actions.push(`${result.id}_${action}`);
    }
  }

  const status = blockers.length ? 'hold' : warnings.length ? 'show_with_disclosures' : 'show';
  const packet = {
    set: {
      id: recommendationSet.id,
      title: recommendationSet.title,
      audience: recommendationSet.audience,
    },
    status,
    showableRecommendations: shownItems.length,
    totalRecommendations: recommendations.length,
    concentrationChecks,
    citationHerd: citation,
    staleEvidenceShare: staleShare,
    blockers: unique(blockers),
    warnings: unique(warnings),
    curatorActions: unique(actions),
    itemResults,
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

module.exports = {
  DEFAULT_POLICY,
  digest,
  evaluateRecommendationDiversity,
};
