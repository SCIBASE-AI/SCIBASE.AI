'use strict';

const crypto = require('node:crypto');

const STATUS_PENALTY = {
  active: 0,
  corrected: 12,
  expression_of_concern: 55,
  retracted: 100,
  unknown: 18
};

const EVIDENCE_SCORE = {
  meta_analysis: 34,
  guideline: 30,
  multicenter: 28,
  cohort: 22,
  single_lab: 12
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
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function splitTerms(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 2)
  );
}

function overlapScore(claimText, citation) {
  const claimTerms = splitTerms(claimText);
  const keywords = new Set((citation.keywords || []).map((keyword) => keyword.toLowerCase()));
  let matches = 0;

  for (const keyword of keywords) {
    if (claimTerms.has(keyword)) {
      matches += 1;
    }
  }

  return Math.min(34, matches * 10);
}

function buildMap(values, key) {
  return new Map(values.map((value) => [value[key], value]));
}

function signalForCitation(citation, signalMap) {
  return signalMap.get(citation.doi) || {
    doi: citation.doi,
    status: 'active',
    source: 'no_watch_signal',
    reason: 'No retraction, correction, or expression-of-concern signal found.'
  };
}

function scoreCitationForClaim(claim, citation, signal, currentYear) {
  const evidenceScore = EVIDENCE_SCORE[citation.evidenceLevel] || 8;
  const recencyScore = Math.max(0, Math.min(18, currentYear - citation.year > 8 ? 2 : 18 - (currentYear - citation.year)));
  const relevanceScore = overlapScore(claim.text, citation);
  const baseScore = 42 + evidenceScore + recencyScore + relevanceScore;
  const safetyPenalty = STATUS_PENALTY[signal.status] ?? STATUS_PENALTY.unknown;
  const reliabilityScore = Math.max(0, Math.min(100, baseScore - safetyPenalty));

  return {
    doi: citation.doi,
    title: citation.title,
    status: signal.status,
    evidenceLevel: citation.evidenceLevel,
    year: citation.year,
    reliabilityScore,
    recommendation: chooseRecommendation(signal.status, reliabilityScore),
    signalSource: signal.source,
    signalReason: signal.reason
  };
}

function chooseRecommendation(status, reliabilityScore) {
  if (status === 'retracted') {
    return 'block';
  }

  if (status === 'expression_of_concern') {
    return 'block_for_manual_review';
  }

  if (status === 'corrected') {
    return 'allow_with_erratum_note';
  }

  return reliabilityScore >= 70 ? 'recommend' : 'manual_review';
}

function createWatchEvent(type, payload, issuedAt) {
  const envelope = {
    type,
    version: '2026-05-citation-watch',
    issuedAt,
    payload
  };

  return {
    ...envelope,
    digest: digest(envelope)
  };
}

function pickReplacement(scoredCandidates, currentDoi) {
  return scoredCandidates
    .filter((candidate) => candidate.doi !== currentDoi)
    .filter((candidate) => candidate.recommendation === 'recommend' || candidate.recommendation === 'allow_with_erratum_note')
    .sort((left, right) => right.reliabilityScore - left.reliabilityScore)[0] || null;
}

function summarizeStatus(actions) {
  if (actions.some((action) => action.severity === 'critical')) {
    return 'block_until_citations_replaced';
  }

  if (actions.length > 0) {
    return 'human_review_required';
  }

  return 'clear';
}

function actionForClaim(claim, currentSignal, replacement) {
  if (currentSignal.status === 'retracted') {
    return {
      id: `replace_retracted_citation:${claim.id}`,
      type: 'replace_retracted_citation',
      severity: 'critical',
      claimId: claim.id,
      section: claim.section,
      currentDoi: claim.currentCitationDoi,
      replacementDoi: replacement && replacement.doi,
      summary: `Replace retracted citation ${claim.currentCitationDoi}.`,
      reason: currentSignal.reason
    };
  }

  if (currentSignal.status === 'expression_of_concern') {
    return {
      id: `replace_expression_of_concern:${claim.id}`,
      type: 'replace_expression_of_concern',
      severity: 'high',
      claimId: claim.id,
      section: claim.section,
      currentDoi: claim.currentCitationDoi,
      replacementDoi: replacement && replacement.doi,
      summary: `Hold citation ${claim.currentCitationDoi} for manual review because of an expression of concern.`,
      reason: currentSignal.reason
    };
  }

  if (currentSignal.status === 'corrected') {
    return {
      id: `add_correction_note:${claim.id}`,
      type: 'add_correction_note',
      severity: 'medium',
      claimId: claim.id,
      section: claim.section,
      currentDoi: claim.currentCitationDoi,
      replacementDoi: replacement && replacement.doi,
      summary: `Keep ${claim.currentCitationDoi} only with an erratum note.`,
      reason: currentSignal.reason
    };
  }

  return null;
}

function evaluateCitationWatch(input, options = {}) {
  const issuedAt = options.issuedAt || '2026-05-16T00:00:00.000Z';
  const currentYear = options.currentYear || 2026;
  const citationMap = buildMap(input.citationCatalog || [], 'doi');
  const signalMap = buildMap(input.watchSignals || [], 'doi');
  const claimEvaluations = [];
  const actions = [];
  const events = [];

  for (const claim of input.claims || []) {
    const candidates = (claim.candidateDois || [])
      .map((doi) => citationMap.get(doi))
      .filter(Boolean)
      .map((citation) => {
        const signal = signalForCitation(citation, signalMap);
        return scoreCitationForClaim(claim, citation, signal, currentYear);
      })
      .sort((left, right) => right.reliabilityScore - left.reliabilityScore);

    const currentCitation = citationMap.get(claim.currentCitationDoi);
    const currentSignal = currentCitation
      ? signalForCitation(currentCitation, signalMap)
      : { doi: claim.currentCitationDoi, status: 'unknown', reason: 'Current citation is not in the local catalog.' };
    const replacement = pickReplacement(candidates, claim.currentCitationDoi);
    const action = actionForClaim(claim, currentSignal, replacement);

    if (action) {
      actions.push(action);
      events.push(createWatchEvent(`citation.${action.type}`, {
        claimId: claim.id,
        currentDoi: claim.currentCitationDoi,
        replacementDoi: action.replacementDoi,
        severity: action.severity
      }, issuedAt));
    }

    claimEvaluations.push({
      claimId: claim.id,
      section: claim.section,
      currentDoi: claim.currentCitationDoi,
      currentStatus: currentSignal.status,
      topRecommendation: replacement,
      candidates,
      status: chooseClaimStatus(currentSignal.status)
    });
  }

  const insertionPlan = buildInsertionPlan(input.manuscript, claimEvaluations, actions);
  const peerReviewFindings = actions.map((action) => ({
    severity: action.severity,
    section: action.section,
    claimId: action.claimId,
    finding: action.summary,
    suggestedDoi: action.replacementDoi || null
  }));

  return {
    summary: {
      manuscriptId: input.manuscript && input.manuscript.id,
      claimsEvaluated: claimEvaluations.length,
      citationsChecked: new Set((input.claims || []).flatMap((claim) => claim.candidateDois || [])).size,
      blockedCitations: actions.filter((action) => action.severity === 'critical' || action.severity === 'high').length,
      correctionNotes: actions.filter((action) => action.type === 'add_correction_note').length,
      replacementSuggestions: actions.filter((action) => action.replacementDoi).length,
      status: summarizeStatus(actions)
    },
    claimEvaluations,
    actions,
    insertionPlan,
    peerReviewFindings,
    watchEvents: events,
    auditDigest: digest({ actions, insertionPlan, peerReviewFindings })
  };
}

function chooseClaimStatus(status) {
  if (status === 'retracted') {
    return 'blocked';
  }

  if (status === 'expression_of_concern') {
    return 'manual_review_block';
  }

  if (status === 'corrected') {
    return 'allowed_with_note';
  }

  return 'clear';
}

function buildInsertionPlan(manuscript, claimEvaluations, actions) {
  const actionMap = new Map(actions.map((action) => [action.claimId, action]));

  return {
    manuscriptId: manuscript && manuscript.id,
    draftVersion: manuscript && manuscript.draftVersion,
    insertions: claimEvaluations.map((evaluation) => {
      const action = actionMap.get(evaluation.claimId);
      return {
        claimId: evaluation.claimId,
        section: evaluation.section,
        currentDoi: evaluation.currentDoi,
        status: evaluation.status,
        recommendedDoi: action && action.replacementDoi ? action.replacementDoi : evaluation.currentDoi,
        noteRequired: action ? action.type === 'add_correction_note' : false,
        blocked: evaluation.status === 'blocked' || evaluation.status === 'manual_review_block'
      };
    })
  };
}

module.exports = {
  evaluateCitationWatch,
  createWatchEvent,
  digest,
  stableStringify
};
