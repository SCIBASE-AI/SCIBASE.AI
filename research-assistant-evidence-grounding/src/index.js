import crypto from 'node:crypto';

const DOMAIN_TEMPLATES = {
  molecular_biology: {
    requiredEvidence: ['dataset', 'protocol', 'statistical-analysis'],
    commonRisks: ['missing replication cohort', 'unreported controls', 'batch-effect risk'],
    reviewerLens: 'methods and biological validity'
  },
  clinical_trials: {
    requiredEvidence: ['protocol', 'statistical-analysis', 'ethics-approval'],
    commonRisks: ['underpowered subgroup', 'missing adverse-event table', 'endpoint drift'],
    reviewerLens: 'trial design and safety reporting'
  },
  quantum_physics: {
    requiredEvidence: ['simulation-code', 'raw-measurements', 'calibration-log'],
    commonRisks: ['insufficient calibration detail', 'unbounded numerical error'],
    reviewerLens: 'theoretical assumptions and experimental calibration'
  },
  generic: {
    requiredEvidence: ['dataset', 'code', 'method-note'],
    commonRisks: ['missing citation', 'unclear method', 'weak evidence trace'],
    reviewerLens: 'clarity, rigor, and reproducibility'
  }
};

const REQUIRED_PROJECT_KEYS = ['projectId', 'domain', 'manuscript', 'evidenceLibrary', 'reproducibility', 'corpus'];

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
}

export function normalizeProject(project) {
  assertObject(project, 'project');
  const missing = REQUIRED_PROJECT_KEYS.filter((key) => project[key] === undefined || project[key] === null);
  if (missing.length) throw new Error(`project missing required fields: ${missing.join(', ')}`);
  assertObject(project.manuscript, 'manuscript');
  if (!Array.isArray(project.manuscript.claims) || project.manuscript.claims.length === 0) {
    throw new Error('manuscript.claims must include at least one claim');
  }
  if (!Array.isArray(project.evidenceLibrary)) throw new Error('evidenceLibrary must be an array');
  if (!Array.isArray(project.corpus)) throw new Error('corpus must be an array');
  const template = DOMAIN_TEMPLATES[project.domain] || DOMAIN_TEMPLATES.generic;
  const normalizedClaims = project.manuscript.claims.map((claim, index) => {
    if (!claim.id || !claim.text) throw new Error(`claim at index ${index} requires id and text`);
    return {
      expectedEvidence: [],
      citations: [],
      artifacts: [],
      importance: 'medium',
      ...claim
    };
  });
  return {
    ...project,
    domainTemplate: template,
    manuscript: {
      title: project.manuscript.title || 'Untitled manuscript',
      abstract: project.manuscript.abstract || '',
      sections: project.manuscript.sections || [],
      claims: normalizedClaims
    },
    auditHash: stableHash({ projectId: project.projectId, claims: normalizedClaims, evidence: project.evidenceLibrary })
  };
}

function scoreEvidenceForClaim(claim, evidenceById) {
  const expected = new Set(claim.expectedEvidence || []);
  const artifactHits = (claim.artifacts || []).map((id) => evidenceById.get(id)).filter(Boolean);
  const citationHits = (claim.citations || []).map((id) => evidenceById.get(id)).filter(Boolean);
  const allHits = [...artifactHits, ...citationHits];
  const presentTypes = new Set(allHits.map((item) => item.type));
  const missingTypes = [...expected].filter((type) => !presentTypes.has(type));
  const invalidReferences = [...(claim.artifacts || []), ...(claim.citations || [])].filter((id) => !evidenceById.has(id));
  const staleReferences = allHits.filter((item) => item.year && item.year < 2020).map((item) => item.id);
  const reproducibleHits = allHits.filter((item) => item.reproducible || item.peerReviewed).length;
  const expectedCoverage = expected.size ? (expected.size - missingTypes.length) / expected.size : allHits.length > 0 ? 1 : 0;
  const qualityBoost = Math.min(0.25, reproducibleHits * 0.08);
  const penalty = invalidReferences.length * 0.18 + staleReferences.length * 0.05;
  const supportScore = Math.max(0, Math.min(1, Number((expectedCoverage * 0.75 + qualityBoost - penalty).toFixed(3))));
  return {
    claimId: claim.id,
    text: claim.text,
    importance: claim.importance,
    supportScore,
    supported: supportScore >= 0.72 && invalidReferences.length === 0,
    evidenceIds: allHits.map((item) => item.id),
    presentTypes: [...presentTypes].sort(),
    missingTypes,
    invalidReferences,
    staleReferences
  };
}

export function buildEvidenceMap(projectInput) {
  const project = normalizeProject(projectInput);
  const evidenceById = new Map(project.evidenceLibrary.map((item) => [item.id, item]));
  const claimMap = project.manuscript.claims.map((claim) => scoreEvidenceForClaim(claim, evidenceById));
  const weakClaims = claimMap.filter((claim) => !claim.supported || claim.missingTypes.length > 0 || claim.invalidReferences.length > 0);
  const coverage = Number((claimMap.filter((claim) => claim.supported).length / claimMap.length).toFixed(3));
  return {
    projectId: project.projectId,
    domain: project.domain,
    reviewerLens: project.domainTemplate.reviewerLens,
    coverage,
    readyForInternalReview: coverage >= 0.75 && weakClaims.length <= 1,
    weakClaims,
    claims: claimMap,
    auditHash: stableHash({ project: project.projectId, claimMap })
  };
}

export function generatePeerReviewReport(projectInput, evidenceMap = buildEvidenceMap(projectInput)) {
  const project = normalizeProject(projectInput);
  const findings = [];
  if ((project.manuscript.abstract || '').split(/\s+/).filter(Boolean).length < 40) {
    findings.push({ severity: 'medium', category: 'clarity', message: 'Abstract is short; add design, data, and result summary before release.' });
  }
  for (const risk of project.domainTemplate.commonRisks) {
    if (!project.manuscript.sections.some((section) => JSON.stringify(section).toLowerCase().includes(risk.split(' ')[0]))) {
      findings.push({ severity: 'low', category: 'domain-template', message: `Domain template check: ${risk}.` });
    }
  }
  for (const weak of evidenceMap.weakClaims) {
    const severity = weak.importance === 'high' ? 'high' : 'medium';
    findings.push({
      severity,
      category: 'claims-vs-evidence',
      claimId: weak.claimId,
      message: `Claim support score ${weak.supportScore}; missing ${weak.missingTypes.join(', ') || 'no required types'}; invalid references ${weak.invalidReferences.join(', ') || 'none'}.`
    });
  }
  const methodologicalSignals = project.evidenceLibrary.filter((item) => ['protocol', 'statistical-analysis', 'simulation-code'].includes(item.type));
  if (methodologicalSignals.length === 0) {
    findings.push({ severity: 'high', category: 'methodology', message: 'No protocol, statistical-analysis, or simulation-code evidence found.' });
  }
  const highSeverity = findings.filter((finding) => finding.severity === 'high').length;
  const mediumSeverity = findings.filter((finding) => finding.severity === 'medium').length;
  return {
    projectId: project.projectId,
    template: project.domain,
    reviewerLens: project.domainTemplate.reviewerLens,
    recommendation: highSeverity ? 'revise_before_release' : mediumSeverity > 2 ? 'minor_revision' : 'ready_for_team_review',
    findings,
    summary: `${findings.length} findings (${highSeverity} high, ${mediumSeverity} medium) across clarity, methodology, and claims-vs-evidence checks.`,
    auditHash: stableHash({ projectId: project.projectId, findings })
  };
}

export function runReproducibilityCheck(projectInput) {
  const project = normalizeProject(projectInput);
  const repro = project.reproducibility || {};
  const checks = [
    { id: 'environment', passed: Boolean(repro.environment?.type && repro.environment?.lockfile), weight: 20, message: 'Environment definition and lockfile present.' },
    { id: 'raw-data', passed: Boolean(repro.rawData?.available && repro.rawData?.checksum), weight: 20, message: 'Raw data availability and checksum present.' },
    { id: 'pipeline', passed: Array.isArray(repro.pipelineSteps) && repro.pipelineSteps.length > 0 && repro.pipelineSteps.every((step) => step.command && step.input && step.output), weight: 20, message: 'Raw-to-results pipeline steps are declared.' },
    { id: 'reported-results', passed: Array.isArray(repro.reportedResults) && repro.reportedResults.every((result) => result.expected === result.observed), weight: 25, message: 'Reported outputs match observed outputs.' },
    { id: 'attempt-history', passed: Array.isArray(repro.previousAttempts) && repro.previousAttempts.some((attempt) => attempt.status === 'passed'), weight: 15, message: 'Links to previous reproducibility attempts exist.' }
  ];
  const passedWeight = checks.filter((check) => check.passed).reduce((sum, check) => sum + check.weight, 0);
  const blockers = checks.filter((check) => !check.passed).map((check) => ({ id: check.id, message: check.message }));
  const confidenceScore = passedWeight;
  return {
    projectId: project.projectId,
    confidenceScore,
    status: blockers.length === 0 ? 'reproducible' : confidenceScore >= 70 ? 'needs_minor_evidence' : 'blocked',
    checks,
    blockers,
    attemptLinks: (repro.previousAttempts || []).map((attempt) => attempt.url).filter(Boolean),
    auditHash: stableHash({ projectId: project.projectId, checks, blockers })
  };
}

export function findResearchGaps(projectInput) {
  const project = normalizeProject(projectInput);
  const interests = new Set(project.researcherInterests || []);
  const capabilities = new Set(project.labCapabilities || []);
  const opportunities = project.corpus
    .filter((record) => record.unresolvedQuestions?.length || record.replicationCount < 2 || record.negativeSignals?.length)
    .map((record) => {
      const interestOverlap = (record.tags || []).filter((tag) => interests.has(tag)).length;
      const capabilityOverlap = (record.requiredCapabilities || []).filter((capability) => capabilities.has(capability)).length;
      const unresolvedScore = Math.min(30, (record.unresolvedQuestions || []).length * 10);
      const replicationGap = record.replicationCount < 2 ? 25 : 0;
      const negativeSignalScore = Math.min(20, (record.negativeSignals || []).length * 10);
      const fitScore = Math.min(25, interestOverlap * 7 + capabilityOverlap * 6);
      const priorityScore = unresolvedScore + replicationGap + negativeSignalScore + fitScore;
      return {
        id: record.id,
        title: record.title,
        tags: record.tags || [],
        unresolvedQuestions: record.unresolvedQuestions || [],
        negativeSignals: record.negativeSignals || [],
        replicationCount: record.replicationCount || 0,
        priorityScore,
        rationale: [
          replicationGap ? 'low replication' : null,
          unresolvedScore ? 'unresolved questions' : null,
          negativeSignalScore ? 'negative results/limitations available' : null,
          fitScore ? 'matches researcher interests or lab capabilities' : null
        ].filter(Boolean)
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id));
  return {
    projectId: project.projectId,
    opportunities,
    topOpportunity: opportunities[0] || null,
    auditHash: stableHash({ projectId: project.projectId, opportunities })
  };
}

export function buildAssistantBrief(projectInput) {
  const evidenceMap = buildEvidenceMap(projectInput);
  const peerReview = generatePeerReviewReport(projectInput, evidenceMap);
  const reproducibility = runReproducibilityCheck(projectInput);
  const gaps = findResearchGaps(projectInput);
  const releaseReady = evidenceMap.readyForInternalReview && peerReview.recommendation !== 'revise_before_release' && reproducibility.confidenceScore >= 80;
  return {
    projectId: evidenceMap.projectId,
    status: releaseReady ? 'assistant_ready' : 'needs_researcher_attention',
    evidenceCoverage: evidenceMap.coverage,
    peerReviewRecommendation: peerReview.recommendation,
    reproducibilityConfidence: reproducibility.confidenceScore,
    topResearchGap: gaps.topOpportunity,
    blockers: [...evidenceMap.weakClaims.map((claim) => `weak-claim:${claim.claimId}`), ...reproducibility.blockers.map((blocker) => `repro:${blocker.id}`)],
    auditHash: stableHash({ evidenceMap, peerReview, reproducibility, topGap: gaps.topOpportunity })
  };
}
