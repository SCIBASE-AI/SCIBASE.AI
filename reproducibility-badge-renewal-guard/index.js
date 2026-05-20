'use strict';

const crypto = require('crypto');

const DECISION_RANK = {
  renewed: 0,
  needs_review: 1,
  expired: 2,
  revoked: 3,
};

const DEFAULTS = {
  maxEvidenceAgeDays: 365,
  minIndependentVerifiers: 2,
  minRerunPassRate: 0.8,
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
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function validateCandidate(candidate, findings) {
  let decision = 'renewed';

  if (!candidate.userId || !candidate.projectId || !candidate.badgeId) {
    addFinding(findings, 'blocker', 'badge_identity_missing', 'Badge candidate requires user, project, and badge identifiers.', {
      userId: candidate.userId || null,
      projectId: candidate.projectId || null,
      badgeId: candidate.badgeId || null,
    });
    decision = worstDecision(decision, 'revoked');
  }

  if (!Array.isArray(candidate.reruns) || candidate.reruns.length === 0) {
    addFinding(findings, 'blocker', 'rerun_evidence_missing', 'Reproducibility badge renewal requires independent rerun evidence.', {
      badgeId: candidate.badgeId || null,
    });
    decision = worstDecision(decision, 'expired');
  }

  return decision;
}

function countIndependentVerifiers(candidate) {
  const projectInstitutions = new Set(candidate.authorInstitutions || []);
  return new Set(
    (candidate.reruns || [])
      .filter((rerun) => rerun.verifierId !== candidate.userId)
      .filter((rerun) => !projectInstitutions.has(rerun.verifierInstitution))
      .map((rerun) => rerun.verifierId)
  ).size;
}

function evaluateReruns(candidate, checkedAt, findings) {
  let decision = 'renewed';
  const reruns = candidate.reruns || [];
  const passCount = reruns.filter((rerun) => rerun.status === 'passed').length;
  const passRate = reruns.length ? passCount / reruns.length : 0;
  const independentVerifiers = countIndependentVerifiers(candidate);

  if (independentVerifiers < DEFAULTS.minIndependentVerifiers) {
    addFinding(findings, 'warning', 'independent_verifiers_insufficient', 'Badge renewal lacks enough independent verifier identities.', {
      badgeId: candidate.badgeId,
      independentVerifiers,
      required: DEFAULTS.minIndependentVerifiers,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  if (reruns.length && passRate < DEFAULTS.minRerunPassRate) {
    addFinding(findings, 'blocker', 'rerun_pass_rate_low', 'Rerun pass rate is below the reproducibility badge renewal threshold.', {
      badgeId: candidate.badgeId,
      passRate: Number(passRate.toFixed(3)),
      required: DEFAULTS.minRerunPassRate,
    });
    decision = worstDecision(decision, 'expired');
  }

  reruns.forEach((rerun) => {
    const verifiedAt = asDate(rerun.verifiedAt);
    if (!verifiedAt) {
      addFinding(findings, 'warning', 'rerun_verified_time_missing', 'Rerun evidence is missing a verification timestamp.', {
        badgeId: candidate.badgeId,
        rerunId: rerun.id,
      });
      decision = worstDecision(decision, 'needs_review');
      return;
    }

    const ageDays = daysBetween(verifiedAt, checkedAt);
    if (ageDays > DEFAULTS.maxEvidenceAgeDays) {
      addFinding(findings, 'warning', 'rerun_evidence_stale', 'Rerun evidence is older than the renewal freshness window.', {
        badgeId: candidate.badgeId,
        rerunId: rerun.id,
        ageDays: Number(ageDays.toFixed(1)),
        limitDays: DEFAULTS.maxEvidenceAgeDays,
      });
      decision = worstDecision(decision, 'needs_review');
    }

    if (rerun.verifierId === candidate.userId) {
      addFinding(findings, 'warning', 'self_verification_detected', 'Self-verification cannot count as independent reproducibility evidence.', {
        badgeId: candidate.badgeId,
        rerunId: rerun.id,
        verifierId: rerun.verifierId,
      });
      decision = worstDecision(decision, 'needs_review');
    }
  });

  return {
    decision,
    passRate: Number(passRate.toFixed(3)),
    independentVerifiers,
  };
}

function evaluateArtifactDrift(candidate, findings) {
  let decision = 'renewed';
  const expected = candidate.expectedHashes || {};
  const observed = candidate.observedHashes || {};
  const drifted = Object.keys(expected).filter((key) => expected[key] !== observed[key]);

  if (drifted.length > 0) {
    addFinding(findings, 'blocker', 'artifact_hash_drift', 'Badge evidence no longer matches current artifact hashes.', {
      badgeId: candidate.badgeId,
      drifted,
    });
    decision = worstDecision(decision, 'expired');
  }

  if (!observed.environment || !observed.code || !observed.data) {
    addFinding(findings, 'warning', 'artifact_hash_coverage_incomplete', 'Observed hashes should cover environment, code, and data artifacts.', {
      badgeId: candidate.badgeId,
      observedKeys: Object.keys(observed),
    });
    decision = worstDecision(decision, 'needs_review');
  }

  return decision;
}

function evaluateIntegritySignals(candidate, findings) {
  let decision = 'renewed';

  if (candidate.signals?.retractionNotice) {
    addFinding(findings, 'blocker', 'retraction_notice_present', 'A retraction notice blocks reproducibility badge renewal.', {
      badgeId: candidate.badgeId,
      notice: candidate.signals.retractionNotice,
    });
    decision = worstDecision(decision, 'revoked');
  }

  if (candidate.signals?.majorCorrection) {
    addFinding(findings, 'warning', 'major_correction_present', 'A major correction requires badge reviewer approval before renewal.', {
      badgeId: candidate.badgeId,
      correction: candidate.signals.majorCorrection,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  if (candidate.signals?.openAppeal) {
    addFinding(findings, 'warning', 'open_badge_appeal', 'An open badge appeal should pause automated leaderboard updates.', {
      badgeId: candidate.badgeId,
      appealId: candidate.signals.openAppeal,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  return decision;
}

function reputationDeltaFor(decision, stats) {
  if (decision === 'renewed') {
    return 12 + stats.independentVerifiers * 2;
  }
  if (decision === 'needs_review') {
    return 0;
  }
  if (decision === 'expired') {
    return -8;
  }
  return -20;
}

function evaluateCandidate(candidate, checkedAt, findings) {
  let decision = validateCandidate(candidate, findings);
  const rerunStats = evaluateReruns(candidate, checkedAt, findings);
  decision = worstDecision(decision, rerunStats.decision);
  decision = worstDecision(decision, evaluateArtifactDrift(candidate, findings));
  decision = worstDecision(decision, evaluateIntegritySignals(candidate, findings));

  return {
    userId: candidate.userId || null,
    projectId: candidate.projectId || null,
    badgeId: candidate.badgeId || null,
    decision,
    passRate: rerunStats.passRate,
    independentVerifiers: rerunStats.independentVerifiers,
    reputationDelta: reputationDeltaFor(decision, rerunStats),
    leaderboardHold: decision !== 'renewed',
    digest: digest({
      userId: candidate.userId,
      projectId: candidate.projectId,
      badgeId: candidate.badgeId,
      decision,
      passRate: rerunStats.passRate,
      independentVerifiers: rerunStats.independentVerifiers,
      expectedHashes: candidate.expectedHashes,
      observedHashes: candidate.observedHashes,
    }),
  };
}

function buildReviewerTasks(findings, badgeResults) {
  const tasks = [];

  if (findings.some((finding) => finding.code === 'retraction_notice_present')) {
    tasks.push('Revoke badges linked to retracted work and remove them from leaderboards.');
  }

  if (findings.some((finding) => finding.code === 'artifact_hash_drift' || finding.code === 'rerun_pass_rate_low')) {
    tasks.push('Expire affected badges until fresh independent reruns match current artifacts.');
  }

  if (findings.some((finding) => finding.code.includes('verifier') || finding.code.includes('appeal'))) {
    tasks.push('Route warning-level badge cases to reputation moderators before publishing deltas.');
  }

  if (badgeResults.every((badge) => badge.decision === 'renewed')) {
    tasks.push('Publish renewed badge deltas to profiles and leaderboards.');
  }

  return tasks;
}

function evaluateBadgeRenewals(input) {
  const candidates = input.candidates || [];
  const checkedAt = asDate(input.checkedAt) || new Date();
  const findings = [];

  const badges = candidates.map((candidate) => evaluateCandidate(candidate, checkedAt, findings));
  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  return {
    checkedAt: checkedAt.toISOString(),
    decision: badges.some((badge) => badge.decision === 'revoked') ? 'revoked'
      : badges.some((badge) => badge.decision === 'expired') ? 'expired'
        : badges.some((badge) => badge.decision === 'needs_review') ? 'needs_review'
          : 'renewed',
    summary: {
      totalCandidates: badges.length,
      renewed: badges.filter((badge) => badge.decision === 'renewed').length,
      needsReview: badges.filter((badge) => badge.decision === 'needs_review').length,
      expired: badges.filter((badge) => badge.decision === 'expired').length,
      revoked: badges.filter((badge) => badge.decision === 'revoked').length,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    badges,
    blockers,
    warnings,
    reviewerTasks: buildReviewerTasks(findings, badges),
    leaderboardHold: badges.some((badge) => badge.leaderboardHold),
    auditDigest: digest({
      checkedAt: checkedAt.toISOString(),
      badges,
      findings,
    }),
  };
}

module.exports = {
  evaluateBadgeRenewals,
  stableStringify,
  digest,
};
