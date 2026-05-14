'use strict';

const DEFAULT_THRESHOLDS = {
  ready: 82,
  revise: 65,
};

const DOMAIN_RULES = {
  'clinical-trials': {
    requiredTerms: ['randomized', 'sample', 'adverse', 'endpoint'],
    riskyTerms: ['proves', 'guarantees', 'cures'],
  },
  'molecular-biology': {
    requiredTerms: ['control', 'replicate', 'assay'],
    riskyTerms: ['always', 'never', 'definitive'],
  },
  'quantum-physics': {
    requiredTerms: ['baseline', 'error', 'noise'],
    riskyTerms: ['perfect', 'guaranteed', 'complete'],
  },
  general: {
    requiredTerms: ['method', 'baseline', 'limitation'],
    riskyTerms: ['proves', 'guarantees', 'always'],
  },
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function severityWeight(severity) {
  return severity === 'high' ? 2 : 1;
}

function wordCount(value) {
  const words = String(value || '').trim().match(/\b[\w-]+\b/g);
  return words ? words.length : 0;
}

function scoreEvidenceAlignment(project) {
  const evidence = asArray(project.evidence);
  const citations = asArray(project.manuscript && project.manuscript.citations);
  const statistics = asArray(project.manuscript && project.manuscript.statistics);
  const claims = asArray(project.manuscript && project.manuscript.claims);
  const evidenceIds = new Set(evidence.map((item) => item.id));
  const citationIds = new Set(citations.map((item) => item.id));

  const findings = claims.map((claim) => {
    const linkedEvidence = asArray(claim.evidenceIds).filter((id) => evidenceIds.has(id));
    const linkedCitations = asArray(claim.citationIds).filter((id) => citationIds.has(id));
    const linkedStats = statistics.filter((stat) => asArray(stat.claimIds).includes(claim.id));
    const issues = [];

    if (linkedEvidence.length === 0) {
      issues.push({
        severity: 'high',
        message: `Claim ${claim.id} has no direct evidence artifact.`,
        action: `Add direct evidence for claim ${claim.id}.`,
      });
    }

    if (linkedCitations.length === 0) {
      issues.push({
        severity: 'medium',
        message: `Claim ${claim.id} has no supporting citation.`,
        action: `Attach a relevant citation to claim ${claim.id}.`,
      });
    }

    if (claim.expectedEffect && linkedStats.length === 0) {
      issues.push({
        severity: 'medium',
        message: `Claim ${claim.id} describes an effect without linked statistics.`,
        action: `Link statistical evidence to claim ${claim.id}.`,
      });
    }

    if (linkedStats.some((stat) => Number(stat.sampleSize || 0) < 30)) {
      issues.push({
        severity: 'medium',
        message: `Claim ${claim.id} relies on a small-sample statistic.`,
        action: `Explain power limits or increase sample size for claim ${claim.id}.`,
      });
    }

    return {
      claimId: claim.id,
      text: claim.text,
      linkedEvidence,
      linkedCitations,
      linkedStatistics: linkedStats.map((stat) => stat.name),
      issues,
    };
  });

  const penalty = findings.reduce((total, finding) => {
    return total + finding.issues.reduce((sum, issue) => {
      return sum + (issue.severity === 'high' ? 18 : 9);
    }, 0);
  }, 0);

  return {
    score: clamp(100 - penalty),
    findings,
    unsupportedClaims: findings.filter((finding) => finding.issues.length > 0).length,
  };
}

function scorePeerReview(project, evidenceAlignment) {
  const manuscript = project.manuscript || {};
  const domain = project.domain || 'general';
  const rules = DOMAIN_RULES[domain] || DOMAIN_RULES.general;
  const body = [
    manuscript.abstract,
    manuscript.methods,
    manuscript.results,
    manuscript.limitations,
    asArray(manuscript.claims).map((claim) => claim.text).join(' '),
  ].join(' ');
  const risks = [];

  if (wordCount(manuscript.abstract) < 35) {
    risks.push({
      area: 'clarity',
      severity: 'medium',
      message: 'Abstract is too short for a reviewer to assess scope and contribution.',
      action: 'Expand the abstract with problem, method, result, and limitation context.',
    });
  }

  const missingTerms = rules.requiredTerms.filter((term) => !normalizeText(body).includes(term));
  if (missingTerms.length > 0) {
    risks.push({
      area: 'methodology',
      severity: 'medium',
      message: `Domain review terms missing: ${missingTerms.join(', ')}.`,
      action: `Add explicit discussion of ${missingTerms.join(', ')}.`,
    });
  }

  const riskyTerms = rules.riskyTerms.filter((term) => normalizeText(body).includes(term));
  if (riskyTerms.length > 0) {
    risks.push({
      area: 'claims',
      severity: 'high',
      message: `Overstrong language detected: ${riskyTerms.join(', ')}.`,
      action: 'Qualify causal or universal language and connect it to evidence.',
    });
  }

  if (wordCount(manuscript.limitations) < 20) {
    risks.push({
      area: 'limitations',
      severity: 'medium',
      message: 'Limitations section is thin or missing.',
      action: 'Add concrete threats to validity and boundary conditions.',
    });
  }

  evidenceAlignment.findings.forEach((finding) => {
    finding.issues.forEach((issue) => {
      risks.push({
        area: 'evidence',
        severity: issue.severity,
        message: issue.message,
        action: issue.action,
      });
    });
  });

  const penalty = risks.reduce((total, risk) => total + (risk.severity === 'high' ? 15 : 7), 0);

  return {
    score: clamp(100 - penalty),
    risks,
    reviewSummary: risks.length === 0
      ? 'No blocking peer-review risks detected.'
      : `${risks.length} peer-review risks need author attention.`,
  };
}

function scoreReproducibility(project) {
  const repro = project.reproducibility || {};
  const commands = asArray(repro.commands);
  const datasets = asArray(repro.datasets);
  const outputs = asArray(repro.reportedOutputs);
  const attempts = asArray(repro.previousAttempts);
  const checks = [
    {
      id: 'commands',
      passed: commands.length > 0,
      weight: 16,
      action: 'Add at least one runnable reproduction command.',
    },
    {
      id: 'environment',
      passed: Boolean(repro.environment && (repro.environment.lockfile || repro.environment.container)),
      weight: 16,
      action: 'Add a lockfile or container image reference.',
    },
    {
      id: 'raw-data',
      passed: datasets.some((dataset) => dataset.raw === true),
      weight: 14,
      action: 'Attach or reference raw data used by the manuscript.',
    },
    {
      id: 'checksums',
      passed: datasets.every((dataset) => Boolean(dataset.checksum)) && outputs.every((output) => Boolean(output.checksum)),
      weight: 14,
      action: 'Add checksums for datasets and reported outputs.',
    },
    {
      id: 'seeds',
      passed: asArray(repro.randomSeeds).length > 0,
      weight: 10,
      action: 'Record random seeds for stochastic steps.',
    },
    {
      id: 'tests',
      passed: commands.some((command) => /test|pytest|cargo test|npm test/i.test(command)),
      weight: 14,
      action: 'Add a test command to the reproducibility runbook.',
    },
    {
      id: 'prior-attempts',
      passed: attempts.some((attempt) => attempt.status === 'passed'),
      weight: 16,
      action: 'Link at least one successful reproducibility attempt.',
    },
  ];

  const score = checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0);

  return {
    score: clamp(score),
    checks,
    missingActions: checks.filter((check) => !check.passed).map((check) => check.action),
    deterministicOutputs: outputs.filter((output) => output.deterministic !== false).length,
  };
}

function rankResearchGaps(project) {
  const profile = project.researcherProfile || {};
  const interests = asArray(profile.interests).map(normalizeText);
  const capabilities = asArray(profile.labCapabilities).map(normalizeText);

  const opportunities = asArray(project.corpus).map((paper) => {
    const topics = asArray(paper.topics).map(normalizeText);
    const interestOverlap = topics.filter((topic) => interests.some((interest) => topic.includes(interest) || interest.includes(topic))).length;
    const capabilityOverlap = topics.filter((topic) => capabilities.some((capability) => topic.includes(capability) || capability.includes(topic))).length;
    const replicationGap = Math.max(0, Number(paper.citations || 0) / 100 - Number(paper.replications || 0));
    const limitationSignals = asArray(paper.limitations).length + asArray(paper.openQuestions).length;
    const negativeSignal = asArray(paper.negativeResults).length > 0 ? 2 : 0;
    const score = clamp(
      interestOverlap * 20 +
      capabilityOverlap * 12 +
      replicationGap * 6 +
      limitationSignals * 8 +
      negativeSignal * 8,
    );

    return {
      id: paper.id,
      title: paper.title,
      score: Math.round(score),
      matchedTopics: unique([...topics.filter((topic) => interests.includes(topic)), ...topics.filter((topic) => capabilities.includes(topic))]),
      rationale: [
        replicationGap > 0 ? 'high citation count with limited replication' : '',
        limitationSignals > 0 ? 'explicit limitations or open questions' : '',
        negativeSignal > 0 ? 'negative-result signal may reveal a neglected direction' : '',
      ].filter(Boolean),
    };
  }).sort((a, b) => b.score - a.score);

  return {
    opportunities: opportunities.slice(0, 5),
    topOpportunity: opportunities[0] || null,
  };
}

function buildReviewerCalibration(peerReview, evidenceAlignment, reproducibility) {
  const risks = [
    ...peerReview.risks,
    ...reproducibility.checks
      .filter((check) => !check.passed)
      .map((check) => ({
        area: 'reproducibility',
        severity: check.weight >= 14 ? 'high' : 'medium',
        message: `Missing reproducibility check: ${check.id}.`,
        action: check.action,
      })),
  ];

  return risks
    .sort((a, b) => (b.severity === 'high') - (a.severity === 'high'))
    .slice(0, 6)
    .map((risk, index) => ({
      id: `card-${index + 1}`,
      reviewerPrompt: `As a reviewer, inspect the ${risk.area} risk and decide whether it blocks release.`,
      expectedFinding: risk.message,
      coachingNote: risk.action,
      evidenceTrace: evidenceAlignment.findings
        .filter((finding) => finding.issues.some((issue) => issue.message === risk.message))
        .map((finding) => finding.claimId),
    }));
}

function decide(readinessScore, blockers, thresholds = DEFAULT_THRESHOLDS) {
  if (blockers > 0 || readinessScore < thresholds.revise) {
    return 'hold';
  }
  if (readinessScore < thresholds.ready) {
    return 'revise';
  }
  return 'ready';
}

function buildQualityGate(project, options = {}) {
  if (!project || typeof project !== 'object') {
    throw new TypeError('project must be an object');
  }

  const evidenceAlignment = scoreEvidenceAlignment(project);
  const peerReview = scorePeerReview(project, evidenceAlignment);
  const reproducibility = scoreReproducibility(project);
  const gapFinder = rankResearchGaps(project);
  const reviewerCalibration = buildReviewerCalibration(peerReview, evidenceAlignment, reproducibility);

  const readinessScore = Math.round(
    evidenceAlignment.score * 0.35 +
    peerReview.score * 0.25 +
    reproducibility.score * 0.30 +
    (gapFinder.topOpportunity ? Math.min(100, 60 + gapFinder.topOpportunity.score * 0.4) : 60) * 0.10,
  );

  const blockers = peerReview.risks.filter((risk) => risk.severity === 'high').length +
    reproducibility.checks.filter((check) => !check.passed && check.weight >= 16).length;

  const orderedRisks = peerReview.risks
    .slice()
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));

  const nextActions = unique([
    ...orderedRisks.map((risk) => risk.action),
    ...reproducibility.missingActions,
  ]).slice(0, 8);

  return {
    projectId: project.projectId,
    title: project.title,
    decision: decide(readinessScore, blockers, options.thresholds || DEFAULT_THRESHOLDS),
    readinessScore,
    blockers,
    evidenceAlignment,
    peerReview,
    reproducibility,
    gapFinder,
    reviewerCalibration,
    nextActions,
  };
}

function renderMarkdownReport(gate) {
  const topActions = gate.nextActions.length > 0
    ? gate.nextActions.map((action) => `- ${action}`).join('\n')
    : '- No required actions.';
  const opportunities = gate.gapFinder.opportunities
    .map((opportunity) => `- ${opportunity.title} (${opportunity.score}): ${opportunity.rationale.join('; ') || 'topic match'}`)
    .join('\n') || '- No ranked opportunities.';

  return [
    `# Quality Gate: ${gate.title}`,
    '',
    `Decision: ${gate.decision}`,
    `Readiness score: ${gate.readinessScore}`,
    `Evidence score: ${gate.evidenceAlignment.score}`,
    `Peer-review score: ${gate.peerReview.score}`,
    `Reproducibility score: ${gate.reproducibility.score}`,
    '',
    '## Next Actions',
    topActions,
    '',
    '## Research Opportunities',
    opportunities,
    '',
    '## Reviewer Calibration',
    ...gate.reviewerCalibration.map((card) => `- ${card.id}: ${card.expectedFinding} Action: ${card.coachingNote}`),
  ].join('\n');
}

module.exports = {
  buildQualityGate,
  renderMarkdownReport,
  scoreEvidenceAlignment,
  scorePeerReview,
  scoreReproducibility,
  rankResearchGaps,
};
