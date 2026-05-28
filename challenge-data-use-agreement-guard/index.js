const crypto = require('crypto');

const CONTROLLED_TIERS = new Set(['controlled', 'restricted']);

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function indexedDatasets(challenge) {
  return new Map((challenge.controlledDatasets || []).map((dataset) => [dataset.id, dataset]));
}

function hasActiveAgreement(submission, dataset) {
  if (!CONTROLLED_TIERS.has(normalize(dataset.tier))) {
    return true;
  }

  return (submission.agreements || []).some(
    (agreement) =>
      agreement.datasetId === dataset.id &&
      agreement.duaId === dataset.duaId &&
      agreement.active === true
  );
}

function hasExportClearance(submission, dataset) {
  if (!dataset.exportControlled) {
    return true;
  }

  return (submission.exportClearances || []).some(
    (clearance) => clearance.datasetId === dataset.id && clearance.active === true
  );
}

function checkDatasetUse(submission, dataset, use) {
  const holds = [];

  if (!dataset) {
    return ['unknown-dataset'];
  }

  if (!hasActiveAgreement(submission, dataset)) {
    holds.push(`missing-active-dua:${dataset.id}`);
  }

  if (dataset.permittedUses && !dataset.permittedUses.includes(use.use)) {
    holds.push(`use-not-permitted:${dataset.id}:${use.use}`);
  }

  if (!hasExportClearance(submission, dataset)) {
    holds.push(`missing-export-clearance:${dataset.id}`);
  }

  if (Number(use.daysHeld || 0) > Number(dataset.retentionDays || Infinity)) {
    holds.push(`retention-window-expired:${dataset.id}`);
  }

  return holds;
}

function checkArtifacts(submission) {
  return (submission.artifacts || [])
    .filter((artifact) => artifact.containsControlledRows)
    .map((artifact) => `controlled-rows-in-artifact:${artifact.name}`);
}

function releaseGatesFor(submission, holds) {
  const hasBlockingHold = holds.some((hold) => !hold.startsWith('missing-export-clearance'));
  const hasManualReviewHold = holds.some((hold) => hold.startsWith('missing-export-clearance'));
  const gate = hasBlockingHold || hasManualReviewHold ? 'hold' : 'allow';

  return {
    sponsorReview: submission.sponsorReviewRequested ? gate : 'not-requested',
    payout: submission.payoutRequested ? gate : 'not-requested',
    ipTransfer: submission.ipTransferRequested ? gate : 'not-requested'
  };
}

function decisionFor(holds) {
  if (holds.length === 0) {
    return 'ready';
  }

  if (holds.every((hold) => hold.startsWith('missing-export-clearance'))) {
    return 'manual-review';
  }

  return 'hold';
}

function remediationFor(holds) {
  const actions = [];

  for (const hold of holds) {
    if (hold.startsWith('missing-active-dua')) {
      actions.push('collect active DUA coverage before sponsor review or payout release');
    } else if (hold.startsWith('use-not-permitted')) {
      actions.push('revise the solver use plan to match permitted DUA purposes');
    } else if (hold.startsWith('missing-export-clearance')) {
      actions.push('route export-controlled materials to compliance review before award release');
    } else if (hold.startsWith('retention-window-expired')) {
      actions.push('return or destroy controlled data and attach retention evidence');
    } else if (hold.startsWith('controlled-rows-in-artifact')) {
      actions.push('redact or replace controlled rows before sponsor packet release');
    } else {
      actions.push('resolve dataset mapping before release');
    }
  }

  return [...new Set(actions)];
}

function reviewSubmission(challenge, submission) {
  const datasets = indexedDatasets(challenge);
  const datasetHolds = (submission.datasetUses || []).flatMap((use) =>
    checkDatasetUse(submission, datasets.get(use.datasetId), use)
  );
  const holds = [...new Set([...datasetHolds, ...checkArtifacts(submission)])];
  const decision = decisionFor(holds);

  return {
    submissionId: submission.id,
    teamId: submission.team.id,
    decision,
    holds,
    releaseGates: releaseGatesFor(submission, holds),
    remediation: remediationFor(holds),
    reviewerPacketDigest: digest({
      submissionId: submission.id,
      decision,
      holds,
      gates: releaseGatesFor(submission, holds)
    })
  };
}

function reviewChallengeDataUseReadiness(challenge) {
  const submissionReviews = (challenge.submissions || []).map((submission) =>
    reviewSubmission(challenge, submission)
  );
  const summary = submissionReviews.reduce(
    (counts, review) => {
      counts[review.decision] += 1;
      return counts;
    },
    { ready: 0, hold: 0, 'manual-review': 0 }
  );

  return {
    challengeId: challenge.id,
    title: challenge.title,
    summary,
    submissionReviews,
    auditDigest: digest({ challengeId: challenge.id, summary, submissionReviews })
  };
}

function buildSponsorPacket(challenge, result) {
  return {
    challengeId: challenge.id,
    generatedFor: 'sponsor-review',
    auditDigest: result.auditDigest,
    submissions: result.submissionReviews.map((review) => ({
      submissionId: review.submissionId,
      teamId: review.teamId,
      teamContact: '[redacted]',
      decision: review.decision,
      holds: review.holds,
      releaseGates: review.releaseGates,
      remediation: review.remediation,
      reviewerPacketDigest: review.reviewerPacketDigest
    }))
  };
}

module.exports = {
  buildSponsorPacket,
  reviewChallengeDataUseReadiness
};
