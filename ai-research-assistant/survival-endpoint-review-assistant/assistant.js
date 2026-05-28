'use strict';

const severityWeight = {
  critical: 5,
  high: 3,
  medium: 2,
  low: 1
};

const severityOrder = ['critical', 'high', 'medium', 'low'];

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function sortedSeverityCounts(findings) {
  const counts = countBy(findings, 'severity');
  return severityOrder.reduce((acc, severity) => {
    acc[severity] = counts[severity] || 0;
    return acc;
  }, {});
}

function totalEvents(study) {
  return study.arms.reduce((sum, arm) => sum + arm.events, 0);
}

function censoringRates(study) {
  return study.arms.map((arm) => ({
    arm: arm.name,
    rate: arm.participants === 0 ? 0 : arm.censored / arm.participants
  }));
}

function censoringSpread(study) {
  const rates = censoringRates(study).map((entry) => entry.rate);
  return Math.max(...rates) - Math.min(...rates);
}

function minFollowUpRatio(study) {
  return Math.min(
    ...study.arms.map((arm) => {
      if (!arm.medianEventTimeMonths) return 1;
      return arm.medianFollowUpMonths / arm.medianEventTimeMonths;
    })
  );
}

function addFinding(findings, study, code, severity, domain, evidence, action) {
  findings.push({
    studyId: study.id,
    studyTitle: study.title,
    code,
    severity,
    domain,
    evidence,
    action,
    reviewerHold: severity === 'critical' || severity === 'high'
  });
}

function evaluateStudy(study) {
  const findings = [];
  const eventCount = totalEvents(study);
  const eventsPerVariable = study.model.covariates === 0 ? eventCount : eventCount / study.model.covariates;
  const spread = censoringSpread(study);
  const followUpRatio = minFollowUpRatio(study);
  const maxCensoringRate = Math.max(...censoringRates(study).map((entry) => entry.rate));
  const usesCox = /cox/i.test(study.model.type);
  const hasPhEvidence = study.model.proportionalHazardsEvidence && study.model.proportionalHazardsEvidence !== 'none';
  const phContradicted = Number.isFinite(study.model.schoenfeldP) && study.model.schoenfeldP < 0.05;

  if (!study.endpoint.definition || study.endpoint.definition.length < 24) {
    addFinding(
      findings,
      study,
      'endpoint-definition-thin',
      'high',
      'endpoint definition',
      'The primary endpoint is named but does not define the event origin, censoring rule, or terminal event taxonomy.',
      'Require a precise endpoint definition before accepting time-to-event claims.'
    );
  }

  if (study.exposure.assignment === 'post-baseline' && study.exposure.modeling !== 'time-dependent' && !study.methods.landmarkAnalysis) {
    addFinding(
      findings,
      study,
      'immortal-time-bias-risk',
      'critical',
      'exposure time',
      `Exposure begins after baseline with a median start lag of ${study.exposure.medianStartLagDays} days, but the model treats exposure as baseline-fixed.`,
      'Recast exposure as time-dependent or add a justified landmark analysis with sensitivity checks.'
    );
  }

  if (usesCox && (!hasPhEvidence || phContradicted) && !study.model.timeVaryingEffects) {
    const evidence = phContradicted
      ? `Schoenfeld p=${study.model.schoenfeldP} indicates a proportional-hazards violation, but no time-varying effect model is reported.`
      : 'A Cox model is used without proportional-hazards diagnostics or a time-varying effect fallback.';
    addFinding(
      findings,
      study,
      'proportional-hazards-unsupported',
      'high',
      'model assumptions',
      evidence,
      'Add proportional-hazards diagnostics and use stratified or time-varying coefficients when assumptions fail.'
    );
  }

  if (spread > 0.12) {
    const arms = censoringRates(study)
      .map((entry) => `${entry.arm}: ${percent(entry.rate)}`)
      .join(', ');
    addFinding(
      findings,
      study,
      'censoring-imbalance',
      'high',
      'censoring',
      `Censoring differs by ${percent(spread)} across arms (${arms}).`,
      'Report censoring reasons by arm and add inverse-probability or sensitivity analyses.'
    );
  }

  if (maxCensoringRate > 0.18 && !study.methods.censoringTable) {
    addFinding(
      findings,
      study,
      'missing-censoring-table',
      'medium',
      'censoring',
      `At least one arm has ${percent(maxCensoringRate)} censoring, but no censoring table is included.`,
      'Add a table separating administrative censoring, withdrawal, loss to follow-up, and competing events.'
    );
  }

  if (eventsPerVariable < 10) {
    addFinding(
      findings,
      study,
      'low-events-per-variable',
      eventsPerVariable < 5 ? 'critical' : 'high',
      'model support',
      `${eventCount} events across ${study.model.covariates} modeled covariates gives ${round(eventsPerVariable, 1)} events per variable.`,
      'Reduce model complexity, pre-specify covariates, or provide penalized-regression sensitivity analysis.'
    );
  }

  if (study.endpoint.competingRisk && !study.methods.competingRiskModel) {
    addFinding(
      findings,
      study,
      'competing-risk-model-mismatch',
      'high',
      'endpoint method',
      'A competing terminal event is present, but the analysis does not use cumulative incidence or cause-specific/subdistribution hazard methods.',
      'Add competing-risk analysis and show whether the treatment conclusion changes.'
    );
  }

  if (followUpRatio < 0.9) {
    addFinding(
      findings,
      study,
      'follow-up-shorter-than-event-window',
      'medium',
      'follow-up',
      `The shortest follow-up-to-event-time ratio is ${round(followUpRatio, 2)}, so median follow-up may not support the stated survival horizon.`,
      'Extend follow-up or soften claims that depend on longer event windows.'
    );
  }

  if (study.claims.some((claim) => /improves|extends|superior/i.test(claim)) && findings.some((finding) => finding.reviewerHold)) {
    addFinding(
      findings,
      study,
      'claim-strength-exceeds-survival-evidence',
      'medium',
      'claim calibration',
      'The manuscript makes directional survival-benefit claims while high-severity survival review holds remain unresolved.',
      'Change the claim to hypothesis-generating language until endpoint and model assumptions are cleared.'
    );
  }

  return {
    studyId: study.id,
    studyTitle: study.title,
    eventCount,
    eventsPerVariable: round(eventsPerVariable, 2),
    censoringSpread: round(spread, 3),
    minFollowUpRatio: round(followUpRatio, 2),
    findings
  };
}

function buildReproducibilityActions(findings) {
  const actions = new Set();

  for (const finding of findings) {
    if (finding.domain === 'exposure time') actions.add('Re-run the model with exposure encoded as time-dependent and compare hazard ratios.');
    if (finding.domain === 'model assumptions') actions.add('Export proportional-hazards diagnostics and time-varying coefficient sensitivity plots.');
    if (finding.domain === 'censoring') actions.add('Publish arm-level censoring reasons and repeat estimates with censoring sensitivity weights.');
    if (finding.domain === 'endpoint method') actions.add('Add cumulative-incidence or competing-risk model output alongside Kaplan-Meier estimates.');
    if (finding.domain === 'model support') actions.add('Commit a model-specification manifest with event counts, covariate list, and penalization settings.');
  }

  return [...actions].sort();
}

function buildResearchGapPrompts(findings) {
  const domains = new Set(findings.map((finding) => finding.domain));
  const prompts = [];

  if (domains.has('exposure time')) {
    prompts.push('Map studies that treat post-baseline treatment initiation as baseline exposure and estimate the direction of immortal-time bias.');
  }
  if (domains.has('censoring')) {
    prompts.push('Compare disease areas where informative censoring changes survival conclusions after inverse-probability weighting.');
  }
  if (domains.has('endpoint method')) {
    prompts.push('Identify endpoints where competing-risk models reverse ordinary Kaplan-Meier interpretations.');
  }
  if (domains.has('model assumptions')) {
    prompts.push('Find clinical trial families with recurring proportional-hazards violations and summarize accepted alternative estimands.');
  }

  return prompts.sort();
}

function analyzeSurvivalPackets(packet) {
  const studies = packet.studies.map(evaluateStudy);
  const findings = studies.flatMap((study) => study.findings);
  const severityCounts = sortedSeverityCounts(findings);
  const riskScore = findings.reduce((sum, finding) => sum + severityWeight[finding.severity], 0);
  const reviewerDecision = findings.some((finding) => finding.reviewerHold)
    ? 'hold-for-survival-methods-review'
    : 'ready-for-general-peer-review';

  return {
    generatedBy: 'survival-endpoint-review-assistant',
    packetId: packet.packetId,
    title: packet.title,
    reviewerDecision,
    riskScore,
    severityCounts,
    studies: studies.map(({ findings: _findings, ...study }) => study),
    findings,
    reproducibilityActions: buildReproducibilityActions(findings),
    researchGapPrompts: buildResearchGapPrompts(findings)
  };
}

function generateMarkdownReport(report) {
  const lines = [
    `# ${report.title}`,
    '',
    `Decision: ${report.reviewerDecision}`,
    `Risk score: ${report.riskScore}`,
    '',
    '## Severity Counts',
    '',
    '| Severity | Count |',
    '| --- | ---: |',
    ...severityOrder.map((severity) => `| ${severity} | ${report.severityCounts[severity]} |`),
    '',
    '## Study Summaries',
    '',
    '| Study | Events | Events/Variable | Censoring Spread | Min Follow-up Ratio |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...report.studies.map((study) => `| ${study.studyTitle} | ${study.eventCount} | ${study.eventsPerVariable} | ${study.censoringSpread} | ${study.minFollowUpRatio} |`),
    '',
    '## Findings',
    ''
  ];

  for (const finding of report.findings) {
    lines.push(`### ${finding.severity.toUpperCase()}: ${finding.code}`);
    lines.push(`Study: ${finding.studyTitle}`);
    lines.push(`Evidence: ${finding.evidence}`);
    lines.push(`Action: ${finding.action}`);
    lines.push('');
  }

  lines.push('## Reproducibility Actions');
  lines.push('');
  for (const action of report.reproducibilityActions) {
    lines.push(`- ${action}`);
  }

  lines.push('');
  lines.push('## Research Gap Prompts');
  lines.push('');
  for (const prompt of report.researchGapPrompts) {
    lines.push(`- ${prompt}`);
  }

  return `${lines.join('\n')}\n`;
}

function generateSvgReport(report) {
  const total = Math.max(1, report.findings.length);
  const bars = severityOrder.map((severity, index) => {
    const count = report.severityCounts[severity];
    const width = 40 + Math.round((count / total) * 320);
    const y = 92 + index * 42;
    return [
      `<text x="32" y="${y + 18}" font-family="monospace" font-size="15" fill="#1f2937">${severity}</text>`,
      `<rect x="132" y="${y}" width="${width}" height="24" rx="3" fill="${severity === 'critical' ? '#991b1b' : severity === 'high' ? '#dc2626' : severity === 'medium' ? '#f59e0b' : '#2563eb'}"/>`,
      `<text x="${142 + width}" y="${y + 18}" font-family="monospace" font-size="14" fill="#111827">${count}</text>`
    ].join('\n');
  }).join('\n');

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="320" viewBox="0 0 720 320" role="img" aria-label="Survival endpoint review summary">',
    '<rect width="720" height="320" fill="#f8fafc"/>',
    '<rect x="18" y="18" width="684" height="284" rx="8" fill="#ffffff" stroke="#cbd5e1"/>',
    '<text x="32" y="54" font-family="monospace" font-size="22" font-weight="700" fill="#0f172a">Survival Endpoint Review</text>',
    `<text x="32" y="78" font-family="monospace" font-size="14" fill="#475569">Decision: ${report.reviewerDecision}</text>`,
    bars,
    `<text x="32" y="282" font-family="monospace" font-size="14" fill="#475569">Risk score: ${report.riskScore} | Studies: ${report.studies.length} | Findings: ${report.findings.length}</text>`,
    '</svg>',
    ''
  ].join('\n');
}

module.exports = {
  analyzeSurvivalPackets,
  evaluateStudy,
  generateMarkdownReport,
  generateSvgReport
};
