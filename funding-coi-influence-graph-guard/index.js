'use strict';

const crypto = require('crypto');

const DEFAULTS = {
  maxFunderShare: 0.5,
  minDisclosureCoverage: 0.8,
  riskyFundingTypes: new Set(['industry_sponsor', 'patent_holder', 'vendor']),
};

const DECISION_RANK = {
  publish: 0,
  annotate: 1,
  suppress_recommendation: 2,
  quarantine: 3,
};

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
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function worstDecision(current, next) {
  return DECISION_RANK[next] > DECISION_RANK[current] ? next : current;
}

function addFinding(findings, severity, code, message, evidence) {
  findings.push({ severity, code, message, evidence });
}

function entityMap(graph) {
  return new Map((graph.entities || []).map((entity) => [entity.id, entity]));
}

function edgesByTarget(graph, targetId, type) {
  return (graph.edges || []).filter((edge) => edge.to === targetId && (!type || edge.type === type));
}

function edgesBySource(graph, sourceId, type) {
  return (graph.edges || []).filter((edge) => edge.from === sourceId && (!type || edge.type === type));
}

function evaluateFundingConcentration(work, graph, findings) {
  let decision = 'publish';
  const fundingEdges = edgesByTarget(graph, work.id, 'funds');
  const totalWeight = fundingEdges.reduce((sum, edge) => sum + (edge.weight || 0), 0);
  const largest = fundingEdges.reduce((max, edge) => Math.max(max, edge.weight || 0), 0);
  const largestShare = totalWeight ? largest / totalWeight : 0;

  if (fundingEdges.length > 1 && largestShare > DEFAULTS.maxFunderShare) {
    addFinding(findings, 'warning', 'funder_concentration_high', 'One funder dominates the graph evidence for this work.', {
      workId: work.id,
      largestShare: Number(largestShare.toFixed(3)),
      limit: DEFAULTS.maxFunderShare,
    });
    decision = worstDecision(decision, 'annotate');
  }

  fundingEdges.forEach((edge) => {
    if (DEFAULTS.riskyFundingTypes.has(edge.fundingType) && edge.disclosed !== true) {
      addFinding(findings, 'blocker', 'risky_funding_undisclosed', 'Risky funding edge is missing disclosure evidence.', {
        workId: work.id,
        funderId: edge.from,
        fundingType: edge.fundingType,
      });
      decision = worstDecision(decision, 'suppress_recommendation');
    }
  });

  return { decision, fundingEdges, largestShare };
}

function evaluateDisclosureCoverage(work, graph, findings) {
  let decision = 'publish';
  const coiEdges = edgesByTarget(graph, work.id, 'coi');
  if (coiEdges.length === 0) {
    return { decision, disclosureCoverage: 1 };
  }

  const disclosed = coiEdges.filter((edge) => edge.disclosed === true).length;
  const coverage = disclosed / coiEdges.length;
  if (coverage < DEFAULTS.minDisclosureCoverage) {
    addFinding(findings, 'blocker', 'coi_disclosure_coverage_low', 'COI graph edges do not have enough disclosure coverage.', {
      workId: work.id,
      disclosureCoverage: Number(coverage.toFixed(3)),
      required: DEFAULTS.minDisclosureCoverage,
    });
    decision = worstDecision(decision, 'suppress_recommendation');
  }

  return { decision, disclosureCoverage: Number(coverage.toFixed(3)) };
}

function evaluateSponsorControl(work, graph, entities, findings) {
  let decision = 'publish';
  const datasetEdges = edgesBySource(graph, work.id, 'uses_dataset');

  datasetEdges.forEach((edge) => {
    const dataset = entities.get(edge.to);
    const sponsorEdges = edgesByTarget(graph, edge.to, 'controls');
    sponsorEdges.forEach((sponsorEdge) => {
      if (!sponsorEdge.independentAccessReview) {
        addFinding(findings, 'blocker', 'sponsor_controlled_dataset', 'Sponsor-controlled dataset lacks independent access review evidence.', {
          workId: work.id,
          datasetId: edge.to,
          datasetLabel: dataset ? dataset.label : edge.to,
          sponsorId: sponsorEdge.from,
        });
        decision = worstDecision(decision, 'quarantine');
      }
    });
  });

  return decision;
}

function evaluateAuthorOverlap(work, graph, entities, findings) {
  let decision = 'publish';
  const authorEdges = edgesByTarget(graph, work.id, 'authored');

  authorEdges.forEach((authorEdge) => {
    const author = entities.get(authorEdge.from);
    const affiliations = edgesBySource(graph, authorEdge.from, 'affiliated_with').map((edge) => edge.to);
    const funderIds = edgesByTarget(graph, work.id, 'funds').map((edge) => edge.from);
    const overlap = affiliations.filter((affiliation) => funderIds.includes(affiliation));
    if (overlap.length > 0 && authorEdge.disclosed !== true) {
      addFinding(findings, 'warning', 'author_funder_affiliation_overlap', 'Author affiliation overlaps a funder without explicit work-level disclosure.', {
        workId: work.id,
        authorId: author ? author.id : authorEdge.from,
        overlap,
      });
      decision = worstDecision(decision, 'annotate');
    }
  });

  return decision;
}

function evaluateWork(work, graph, entities, findings) {
  let decision = 'publish';
  const funding = evaluateFundingConcentration(work, graph, findings);
  const disclosure = evaluateDisclosureCoverage(work, graph, findings);
  decision = worstDecision(decision, funding.decision);
  decision = worstDecision(decision, disclosure.decision);
  decision = worstDecision(decision, evaluateSponsorControl(work, graph, entities, findings));
  decision = worstDecision(decision, evaluateAuthorOverlap(work, graph, entities, findings));

  return {
    workId: work.id,
    label: work.label,
    decision,
    recommendationVisible: decision === 'publish' || decision === 'annotate',
    fundingEdgeCount: funding.fundingEdges.length,
    largestFunderShare: Number(funding.largestShare.toFixed(3)),
    disclosureCoverage: disclosure.disclosureCoverage,
    packetDigest: digest({
      workId: work.id,
      decision,
      fundingEdges: funding.fundingEdges,
      disclosureCoverage: disclosure.disclosureCoverage,
    }),
  };
}

function buildCuratorTasks(findings, works) {
  const tasks = [];
  if (findings.some((finding) => finding.code === 'sponsor_controlled_dataset')) {
    tasks.push('Quarantine sponsor-controlled dataset recommendations until independent access review is attached.');
  }
  if (findings.some((finding) => finding.code === 'risky_funding_undisclosed' || finding.code === 'coi_disclosure_coverage_low')) {
    tasks.push('Suppress graph recommendations with undisclosed funding or incomplete COI disclosures.');
  }
  if (findings.some((finding) => finding.code === 'funder_concentration_high' || finding.code === 'author_funder_affiliation_overlap')) {
    tasks.push('Annotate entity pages with funding concentration and author-affiliation overlap warnings.');
  }
  if (works.every((work) => work.decision === 'publish')) {
    tasks.push('Publish all funding influence packets to the knowledge graph recommendation index.');
  }
  return tasks;
}

function evaluateFundingCoiInfluenceGraph(graph) {
  const entities = entityMap(graph);
  const findings = [];
  const works = (graph.entities || [])
    .filter((entity) => entity.kind === 'publication' || entity.kind === 'preprint')
    .map((work) => evaluateWork(work, graph, entities, findings));
  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  return {
    checkedAt: graph.checkedAt,
    decision: works.some((work) => work.decision === 'quarantine') ? 'quarantine'
      : works.some((work) => work.decision === 'suppress_recommendation') ? 'suppress_recommendation'
        : works.some((work) => work.decision === 'annotate') ? 'annotate'
          : 'publish',
    summary: {
      totalWorks: works.length,
      publish: works.filter((work) => work.decision === 'publish').length,
      annotate: works.filter((work) => work.decision === 'annotate').length,
      suppressRecommendation: works.filter((work) => work.decision === 'suppress_recommendation').length,
      quarantine: works.filter((work) => work.decision === 'quarantine').length,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    works,
    blockers,
    warnings,
    curatorTasks: buildCuratorTasks(findings, works),
    recommendationHold: works.some((work) => !work.recommendationVisible),
    auditDigest: digest({
      checkedAt: graph.checkedAt,
      works,
      findings,
    }),
  };
}

module.exports = {
  evaluateFundingCoiInfluenceGraph,
  stableStringify,
  digest,
};
