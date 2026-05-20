'use strict';

const crypto = require('crypto');

const DECISION_RANK = {
  approved: 0,
  needs_review: 1,
  blocked: 2,
};

const DEFAULTS = {
  maxSubmissionsPerTeam: 5,
  resubmissionWindowHours: 24,
  holdoutLeakageBlockThreshold: 0.35,
  scoreTolerance: 0.000001,
  stalePackageDays: 90,
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

function hoursBetween(start, end) {
  return Math.abs(end.getTime() - start.getTime()) / 36e5;
}

function compareMetric(direction, a, b) {
  if (direction === 'minimize') {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  return a > b ? -1 : a < b ? 1 : 0;
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

function normalizeConfig(config) {
  const metric = config.metric || {};
  return {
    id: config.id,
    title: config.title,
    metric: {
      name: metric.name,
      direction: metric.direction,
      tolerance: metric.tolerance ?? DEFAULTS.scoreTolerance,
    },
    rules: {
      maxSubmissionsPerTeam: config.rules?.maxSubmissionsPerTeam ?? DEFAULTS.maxSubmissionsPerTeam,
      resubmissionWindowHours: config.rules?.resubmissionWindowHours ?? DEFAULTS.resubmissionWindowHours,
      blindedHoldoutRequired: config.rules?.blindedHoldoutRequired !== false,
      requireTieBreakers: config.rules?.requireTieBreakers !== false,
      requirePackageHash: config.rules?.requirePackageHash !== false,
    },
    benchmarkPackage: config.benchmarkPackage || {},
    holdout: config.holdout || {},
    tieBreakers: config.tieBreakers || [],
  };
}

function validateConfig(config, findings, checkedAt) {
  let decision = 'approved';

  if (!config.id || !config.title) {
    addFinding(findings, 'blocker', 'challenge_identity_missing', 'Challenge id and title are required for payout arbitration.', {
      id: config.id || null,
      title: config.title || null,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (!config.metric.name || !['maximize', 'minimize'].includes(config.metric.direction)) {
    addFinding(findings, 'blocker', 'metric_contract_invalid', 'Primary metric must declare a name and a maximize/minimize direction.', {
      metric: config.metric,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (config.rules.requirePackageHash && !config.benchmarkPackage.sha256) {
    addFinding(findings, 'blocker', 'benchmark_hash_missing', 'Benchmark package hash is missing, so submissions cannot be tied to a fixed evaluation artifact.', {
      package: config.benchmarkPackage,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (config.rules.requirePackageHash && config.benchmarkPackage.sha256 && !/^sha256:[a-f0-9]{64}$/.test(config.benchmarkPackage.sha256)) {
    addFinding(findings, 'blocker', 'benchmark_hash_malformed', 'Benchmark package hash must use sha256:<64 lowercase hex characters>.', {
      sha256: config.benchmarkPackage.sha256,
    });
    decision = worstDecision(decision, 'blocked');
  }

  const builtAt = asDate(config.benchmarkPackage.builtAt);
  if (!builtAt) {
    addFinding(findings, 'warning', 'benchmark_build_time_missing', 'Benchmark package build timestamp is missing or invalid.', {
      builtAt: config.benchmarkPackage.builtAt || null,
    });
    decision = worstDecision(decision, 'needs_review');
  } else {
    const ageDays = (checkedAt.getTime() - builtAt.getTime()) / 864e5;
    if (ageDays > DEFAULTS.stalePackageDays) {
      addFinding(findings, 'warning', 'benchmark_package_stale', 'Benchmark package is older than the configured freshness window.', {
        ageDays: Number(ageDays.toFixed(1)),
        limitDays: DEFAULTS.stalePackageDays,
      });
      decision = worstDecision(decision, 'needs_review');
    }
  }

  if (config.rules.blindedHoldoutRequired && config.holdout.publiclyReleased) {
    addFinding(findings, 'blocker', 'holdout_publicly_released', 'Holdout data is marked public while blinded evaluation is required.', {
      holdout: config.holdout,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (config.rules.requireTieBreakers && config.tieBreakers.length === 0) {
    addFinding(findings, 'warning', 'tie_breakers_missing', 'No tie-breakers are configured for equal primary scores.', {});
    decision = worstDecision(decision, 'needs_review');
  }

  return decision;
}

function recomputeScore(submission) {
  if (typeof submission.recomputedScore === 'number') {
    return submission.recomputedScore;
  }

  if (!Array.isArray(submission.predictions)) {
    return null;
  }

  const scored = submission.predictions.filter((row) => typeof row.actual === 'number' && typeof row.predicted === 'number');
  if (scored.length === 0) {
    return null;
  }

  const totalAbsoluteError = scored.reduce((sum, row) => sum + Math.abs(row.actual - row.predicted), 0);
  return 1 - totalAbsoluteError / scored.length;
}

function evaluateSubmission(config, submission, history, findings) {
  let decision = 'approved';
  const evidence = {
    submissionId: submission.id,
    teamId: submission.teamId,
  };

  if (!submission.id || !submission.teamId) {
    addFinding(findings, 'blocker', 'submission_identity_missing', 'Submission id and team id are required.', evidence);
    decision = worstDecision(decision, 'blocked');
  }

  if (!submission.metrics || typeof submission.metrics[config.metric.name] !== 'number') {
    addFinding(findings, 'blocker', 'primary_metric_missing', 'Submission does not include the configured primary metric.', {
      ...evidence,
      metric: config.metric.name,
    });
    decision = worstDecision(decision, 'blocked');
  }

  const recomputed = recomputeScore(submission);
  const reported = submission.metrics?.[config.metric.name];
  if (typeof reported === 'number' && typeof recomputed === 'number') {
    const delta = Math.abs(reported - recomputed);
    if (delta > config.metric.tolerance) {
      addFinding(findings, 'blocker', 'metric_recomputation_mismatch', 'Reported score does not match the recomputed score within tolerance.', {
        ...evidence,
        reported,
        recomputed: Number(recomputed.toFixed(8)),
        delta: Number(delta.toFixed(8)),
        tolerance: config.metric.tolerance,
      });
      decision = worstDecision(decision, 'blocked');
    }
  } else {
    addFinding(findings, 'warning', 'metric_recomputation_unavailable', 'Submission cannot be recomputed from the available artifact metadata.', evidence);
    decision = worstDecision(decision, 'needs_review');
  }

  if (submission.datasetAccess?.holdoutRowsViewed > 0 || submission.datasetAccess?.holdoutDownloaded) {
    addFinding(findings, 'blocker', 'holdout_access_detected', 'Submission team accessed holdout data before final scoring.', {
      ...evidence,
      holdoutRowsViewed: submission.datasetAccess.holdoutRowsViewed || 0,
      holdoutDownloaded: Boolean(submission.datasetAccess.holdoutDownloaded),
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (typeof submission.leakageScore === 'number' && submission.leakageScore >= DEFAULTS.holdoutLeakageBlockThreshold) {
    addFinding(findings, 'blocker', 'holdout_leakage_score_high', 'Leakage detector score is above the block threshold.', {
      ...evidence,
      leakageScore: submission.leakageScore,
      threshold: DEFAULTS.holdoutLeakageBlockThreshold,
    });
    decision = worstDecision(decision, 'blocked');
  }

  if (submission.packageSha256 && config.benchmarkPackage.sha256 && submission.packageSha256 !== config.benchmarkPackage.sha256) {
    addFinding(findings, 'blocker', 'benchmark_package_mismatch', 'Submission was evaluated against a different benchmark package hash.', {
      ...evidence,
      expected: config.benchmarkPackage.sha256,
      received: submission.packageSha256,
    });
    decision = worstDecision(decision, 'blocked');
  }

  const teamHistory = history.filter((item) => item.teamId === submission.teamId);
  if (teamHistory.length + 1 > config.rules.maxSubmissionsPerTeam) {
    addFinding(findings, 'warning', 'submission_limit_exceeded', 'Team has exceeded the configured submission limit.', {
      ...evidence,
      previousSubmissions: teamHistory.length,
      limit: config.rules.maxSubmissionsPerTeam,
    });
    decision = worstDecision(decision, 'needs_review');
  }

  const currentTime = asDate(submission.submittedAt);
  if (!currentTime) {
    addFinding(findings, 'warning', 'submission_time_invalid', 'Submission timestamp is missing or invalid.', {
      ...evidence,
      submittedAt: submission.submittedAt || null,
    });
    decision = worstDecision(decision, 'needs_review');
  } else {
    const tooSoon = teamHistory.find((item) => {
      const priorTime = asDate(item.submittedAt);
      return priorTime && hoursBetween(priorTime, currentTime) < config.rules.resubmissionWindowHours;
    });
    if (tooSoon) {
      addFinding(findings, 'warning', 'resubmission_window_violation', 'Team resubmitted before the configured cooldown window elapsed.', {
        ...evidence,
        previousSubmissionId: tooSoon.id,
        hoursSincePrevious: Number(hoursBetween(asDate(tooSoon.submittedAt), currentTime).toFixed(2)),
        requiredHours: config.rules.resubmissionWindowHours,
      });
      decision = worstDecision(decision, 'needs_review');
    }
  }

  if (!submission.auditTrail || submission.auditTrail.length === 0) {
    addFinding(findings, 'warning', 'audit_trail_missing', 'Submission lacks an audit trail for ingestion, evaluation, and publication events.', evidence);
    decision = worstDecision(decision, 'needs_review');
  }

  return {
    id: submission.id,
    teamId: submission.teamId,
    reportedScore: reported ?? null,
    recomputedScore: typeof recomputed === 'number' ? Number(recomputed.toFixed(8)) : null,
    decision,
    digest: digest({
      id: submission.id,
      teamId: submission.teamId,
      metrics: submission.metrics,
      packageSha256: submission.packageSha256,
      submittedAt: submission.submittedAt,
    }),
  };
}

function rankApproved(config, evaluatedSubmissions) {
  const sorted = evaluatedSubmissions
    .filter((submission) => submission.decision !== 'blocked' && typeof submission.reportedScore === 'number')
    .sort((a, b) => compareMetric(config.metric.direction, a.reportedScore, b.reportedScore) || a.id.localeCompare(b.id));

  return sorted.map((submission, index) => ({
      rank: index + 1,
      submissionId: submission.id,
      teamId: submission.teamId,
      score: submission.reportedScore,
      decision: submission.decision,
      tieBreakReady: index === 0 ? true : submission.reportedScore !== sorted[index - 1]?.reportedScore,
    }));
}

function buildReviewerTasks(findings, evaluatedSubmissions) {
  const tasks = [];

  if (findings.some((finding) => finding.code.includes('holdout'))) {
    tasks.push('Freeze payout and rotate holdout credentials before any winner announcement.');
  }

  if (findings.some((finding) => finding.code === 'metric_recomputation_mismatch' || finding.code === 'primary_metric_missing')) {
    tasks.push('Re-run the scorer from immutable benchmark artifacts and attach the scorer log to the challenge record.');
  }

  if (findings.some((finding) => finding.code === 'resubmission_window_violation' || finding.code === 'submission_limit_exceeded')) {
    tasks.push('Review challenge rules for submission abuse and document whether warnings affect prize eligibility.');
  }

  if (evaluatedSubmissions.some((submission) => submission.decision === 'needs_review')) {
    tasks.push('Resolve warning-level findings before moving any submission to sponsor approval.');
  }

  if (tasks.length === 0) {
    tasks.push('Attach this integrity report to the payout packet and proceed with sponsor approval.');
  }

  return tasks;
}

function evaluateChallenge(input) {
  const config = normalizeConfig(input.challenge || {});
  const submissions = input.submissions || [];
  const history = input.submissionHistory || [];
  const checkedAt = asDate(input.checkedAt) || new Date();
  const findings = [];

  let decision = validateConfig(config, findings, checkedAt);

  const evaluatedSubmissions = submissions.map((submission) => {
    const result = evaluateSubmission(config, submission, history, findings);
    decision = worstDecision(decision, result.decision);
    return result;
  });

  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  const leaderboard = rankApproved(config, evaluatedSubmissions);

  return {
    challengeId: config.id || null,
    title: config.title || null,
    decision,
    summary: {
      totalSubmissions: submissions.length,
      approvedOrReviewable: evaluatedSubmissions.filter((submission) => submission.decision !== 'blocked').length,
      blockedSubmissions: evaluatedSubmissions.filter((submission) => submission.decision === 'blocked').length,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    leaderboard,
    submissions: evaluatedSubmissions,
    blockers,
    warnings,
    reviewerTasks: buildReviewerTasks(findings, evaluatedSubmissions),
    payoutHold: decision !== 'approved',
    auditDigest: digest({
      config,
      evaluatedSubmissions,
      findings,
      leaderboard,
    }),
  };
}

module.exports = {
  evaluateChallenge,
  stableStringify,
  digest,
};
