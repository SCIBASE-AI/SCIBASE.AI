'use strict';

const crypto = require('crypto');

const DECISION_RANK = {
  approved: 0,
  needs_review: 1,
  blocked: 2,
};

const DEFAULTS = {
  staleClaimDays: 180,
  highEvidenceThreshold: 0.8,
  strongContradictionThreshold: 0.72,
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

function asDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function daysBetween(start, end) {
  return Math.abs(end.getTime() - start.getTime()) / 864e5;
}

function worstDecision(current, next) {
  return DECISION_RANK[next] > DECISION_RANK[current] ? next : current;
}

function addFinding(findings, severity, code, message, evidence) {
  findings.push({
    severity,
    code,
    message,
    evidence,
  });
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateInput(manuscript, findings) {
  let decision = 'approved';

  if (!manuscript.id || !manuscript.title) {
    addFinding(findings, 'blocker', 'manuscript_identity_missing', 'Manuscript id and title are required for surveillance packets.', {
      id: manuscript.id || null,
      title: manuscript.title || null,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (!Array.isArray(manuscript.claims) || manuscript.claims.length === 0) {
    addFinding(findings, 'blocker', 'claim_inventory_missing', 'The assistant needs at least one manuscript claim to monitor.', {});
    decision = worstDecision(decision, 'blocked');
  }

  return decision;
}

function claimLookup(manuscript) {
  return new Map((manuscript.claims || []).map((claim) => [claim.id, claim]));
}

function eventMatchesClaim(event, claim) {
  return Array.isArray(event.relatedClaimIds) && event.relatedClaimIds.includes(claim.id);
}

function eventCitesEvidence(event, claim) {
  return Array.isArray(event.affectedEvidenceIds)
    && Array.isArray(claim.evidenceIds)
    && event.affectedEvidenceIds.some((id) => claim.evidenceIds.includes(id));
}

function validateClaimFreshness(claim, checkedAt, findings) {
  const reviewedAt = asDate(claim.lastReviewedAt);
  if (!reviewedAt) {
    addFinding(findings, 'warning', 'claim_review_time_missing', 'Claim is missing a last-reviewed timestamp for living-literature surveillance.', {
      claimId: claim.id,
    });
    return 'needs_review';
  }

  const ageDays = daysBetween(reviewedAt, checkedAt);
  if (ageDays > DEFAULTS.staleClaimDays) {
    addFinding(findings, 'warning', 'claim_review_stale', 'Claim has not been checked against the literature within the freshness window.', {
      claimId: claim.id,
      ageDays: Number(ageDays.toFixed(1)),
      limitDays: DEFAULTS.staleClaimDays,
    });
    return 'needs_review';
  }

  return 'approved';
}

function evaluateEventAgainstClaim(event, claim, findings) {
  let decision = 'approved';
  const evidence = {
    eventId: event.id,
    eventType: event.type,
    claimId: claim.id,
  };

  if (event.type === 'retraction' && eventCitesEvidence(event, claim)) {
    addFinding(findings, 'blocker', 'cited_evidence_retracted', 'A cited evidence item for this claim has a retraction notice.', {
      ...evidence,
      affectedEvidenceIds: event.affectedEvidenceIds || [],
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (event.type === 'correction' && eventCitesEvidence(event, claim)) {
    addFinding(findings, 'warning', 'cited_evidence_corrected', 'A cited evidence item has a correction that should be reviewed before relying on the claim.', evidence);
    decision = worstDecision(decision, 'needs_review');
  }

  if (event.relationship === 'refutes' && Number(event.evidenceStrength || 0) >= DEFAULTS.strongContradictionThreshold) {
    addFinding(findings, 'blocker', 'strong_contradictory_evidence', 'New high-strength evidence contradicts this manuscript claim.', {
      ...evidence,
      evidenceStrength: event.evidenceStrength,
      sourceTitle: event.title || null,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (event.relationship === 'supports' && Number(event.evidenceStrength || 0) >= DEFAULTS.highEvidenceThreshold) {
    addFinding(findings, 'warning', 'high_value_supporting_update', 'New strong supporting evidence should be considered for citation updates.', {
      ...evidence,
      evidenceStrength: event.evidenceStrength,
      sourceTitle: event.title || null,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  if (event.type === 'replication' && event.relationship === 'extends' && !event.reproducibilityArtifacts?.available) {
    addFinding(findings, 'warning', 'replication_artifacts_missing', 'A replication-related update lacks reusable artifacts, limiting reproducibility confidence.', evidence);
    decision = worstDecision(decision, 'needs_review');
  }

  return decision;
}

function buildClaimResult(claim, events, checkedAt, findings) {
  let decision = validateClaimFreshness(claim, checkedAt, findings);
  const relatedEvents = events.filter((event) => eventMatchesClaim(event, claim) || eventCitesEvidence(event, claim));

  relatedEvents.forEach((event) => {
    decision = worstDecision(decision, evaluateEventAgainstClaim(event, claim, findings));
  });

  return {
    id: claim.id,
    text: claim.text,
    decision,
    relatedEventIds: relatedEvents.map((event) => event.id),
    evidenceIds: claim.evidenceIds || [],
    digest: digest({
      id: claim.id,
      text: claim.text,
      evidenceIds: claim.evidenceIds,
      relatedEventIds: relatedEvents.map((event) => event.id),
      decision,
    }),
  };
}

function buildUpdateQueue(events, claimsById) {
  return events
    .filter((event) => event.type !== 'background')
    .map((event) => {
      const relatedClaims = (event.relatedClaimIds || []).map((id) => claimsById.get(id)).filter(Boolean);
      const action = event.type === 'retraction'
        ? 'replace_or_remove_citation'
        : event.relationship === 'refutes'
          ? 'revise_claim_or_add_limitation'
          : event.relationship === 'supports'
            ? 'consider_citation_update'
            : 'review_context';

      return {
        eventId: event.id,
        action,
        relatedClaimIds: relatedClaims.map((claim) => claim.id),
        priority: event.type === 'retraction' || event.relationship === 'refutes' ? 'high' : 'normal',
        sourceTitle: event.title || null,
      };
    });
}

function buildGapSignals(events) {
  return events
    .filter((event) => event.relationship === 'extends' || event.relationship === 'negative')
    .map((event) => ({
      eventId: event.id,
      topic: event.topic || 'unspecified',
      signal: event.relationship === 'negative' ? 'negative_or_null_result' : 'extension_opportunity',
      suggestedNextStep: event.suggestedNextStep || 'Add to research-gap review queue.',
      reproducibilityImpact: event.reproducibilityArtifacts?.available ? 'artifact-backed' : 'needs_artifacts',
    }));
}

function buildReviewerTasks(findings, updateQueue, gapSignals) {
  const tasks = [];

  if (findings.some((finding) => finding.code === 'cited_evidence_retracted')) {
    tasks.push('Pause release and replace or remove claims backed by retracted evidence.');
  }

  if (findings.some((finding) => finding.code === 'strong_contradictory_evidence')) {
    tasks.push('Route contradicted claims to author revision before peer-review packet generation.');
  }

  if (findings.some((finding) => finding.code === 'high_value_supporting_update' || finding.code === 'cited_evidence_corrected')) {
    tasks.push('Review citation updates and correction notices before finalizing the assistant report.');
  }

  if (gapSignals.length > 0) {
    tasks.push('Add research-gap opportunities to the assistant discovery queue.');
  }

  if (updateQueue.length === 0) {
    tasks.push('No living-literature changes require action; attach this packet to the assistant audit trail.');
  }

  return tasks;
}

function evaluateLiteratureSurveillance(input) {
  const manuscript = input.manuscript || {};
  const events = input.literatureEvents || [];
  const checkedAt = asDate(input.checkedAt) || new Date();
  const findings = [];
  let decision = validateInput(manuscript, findings);
  const claimsById = claimLookup(manuscript);

  const claims = (manuscript.claims || []).map((claim) => {
    const result = buildClaimResult(claim, events, checkedAt, findings);
    decision = worstDecision(decision, result.decision);
    return result;
  });

  const updateQueue = buildUpdateQueue(events, claimsById);
  const gapSignals = buildGapSignals(events);
  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  return {
    manuscriptId: manuscript.id || null,
    title: manuscript.title || null,
    checkedAt: checkedAt.toISOString(),
    decision,
    summary: {
      totalClaims: claims.length,
      monitoredEvents: events.length,
      blockedClaims: claims.filter((claim) => claim.decision === 'blocked').length,
      reviewClaims: claims.filter((claim) => claim.decision === 'needs_review').length,
      updateQueue: updateQueue.length,
      gapSignals: gapSignals.length,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    claims,
    updateQueue,
    gapSignals,
    blockers,
    warnings,
    reviewerTasks: buildReviewerTasks(findings, updateQueue, gapSignals),
    reportHold: decision !== 'approved',
    auditDigest: digest({
      manuscript: {
        id: manuscript.id,
        title: manuscript.title,
        claims,
      },
      events,
      findings,
      checkedAt: checkedAt.toISOString(),
    }),
  };
}

module.exports = {
  evaluateLiteratureSurveillance,
  stableStringify,
  digest,
};
