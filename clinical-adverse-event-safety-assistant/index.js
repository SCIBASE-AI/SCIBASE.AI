const crypto = require('crypto');

const DOWNSPLAYING_TERMS = [
  'no meaningful safety concerns',
  'no safety concerns',
  'well tolerated',
  'grade 2 or lower',
  'manageable toxicity'
];

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

function redactText(value) {
  return String(value || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/token=[^\s]+/gi, 'token=[redacted]');
}

function rate(numerator, denominator) {
  if (!denominator || denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

function reviewArm(arm) {
  const events = arm.events || [];
  const eventCount = events.reduce((sum, event) => sum + (event.count || 0), 0);
  const grade3PlusEvents = events
    .filter((event) => Number(event.grade || 0) >= 3)
    .reduce((sum, event) => sum + (event.count || 0), 0);
  const missingDenominatorTerms = events
    .filter((event) => !event.participantsAtRisk)
    .map((event) => event.term);

  return {
    armId: arm.id,
    label: arm.label,
    metrics: {
      participants: arm.participants || 0,
      exposurePatientYears: arm.exposurePatientYears || 0,
      eventCount,
      eventRate: round(rate(eventCount, arm.participants || 0)),
      grade3PlusEvents,
      grade3PlusRate: round(rate(grade3PlusEvents, arm.participants || 0)),
      seriousAdverseEvents: arm.seriousAdverseEvents || 0,
      reportedSeriousAdverseEvents: arm.reportedSeriousAdverseEvents || 0,
      seriousAeExposureRate: round(rate(arm.seriousAdverseEvents || 0, arm.exposurePatientYears || 0)),
      missingDenominatorTerms
    }
  };
}

function addFinding(findings, code, severity, message, evidence, action) {
  findings.push({ code, severity, message, evidence, action });
}

function findEventMaxGrade(arms, terms) {
  const normalizedTerms = new Set((terms || []).map((term) => String(term).toLowerCase()));
  let maxGrade = 0;

  for (const arm of arms || []) {
    for (const event of arm.events || []) {
      if (normalizedTerms.has(String(event.term).toLowerCase())) {
        maxGrade = Math.max(maxGrade, Number(event.grade || 0));
      }
    }
  }

  return maxGrade;
}

function hasDownplayingSafetyClaim(claims) {
  return (claims || []).some((claim) => {
    const text = String(claim.text || '').toLowerCase();
    return DOWNSPLAYING_TERMS.some((term) => text.includes(term));
  });
}

function reviewAdverseEventSafety(manuscript) {
  const arms = manuscript.arms || [];
  const armReviews = arms.map(reviewArm);
  const findings = [];

  for (const armReview of armReviews) {
    const { metrics } = armReview;

    if (metrics.seriousAdverseEvents > metrics.reportedSeriousAdverseEvents) {
      addFinding(
        findings,
        'serious-ae-underreported',
        'critical',
        `${armReview.label} reports fewer serious adverse events than captured in source counts.`,
        {
          armId: armReview.armId,
          captured: metrics.seriousAdverseEvents,
          reported: metrics.reportedSeriousAdverseEvents
        },
        'reconcile-serious-adverse-event-table'
      );
    }

    if (metrics.missingDenominatorTerms.length > 0) {
      addFinding(
        findings,
        'missing-event-denominator',
        'high',
        `${armReview.label} has adverse-event rows without participant denominators.`,
        {
          armId: armReview.armId,
          terms: metrics.missingDenominatorTerms
        },
        'add-participants-at-risk-denominators'
      );
    }
  }

  if (armReviews.length > 1) {
    const sortedGradeRates = [...armReviews].sort(
      (left, right) => right.metrics.grade3PlusRate - left.metrics.grade3PlusRate
    );
    const highest = sortedGradeRates[0];
    const lowest = sortedGradeRates[sortedGradeRates.length - 1];
    const gradeRateDelta = highest.metrics.grade3PlusRate - lowest.metrics.grade3PlusRate;
    const gradeRateRatioGap =
      highest.metrics.grade3PlusRate > 0 &&
      (lowest.metrics.grade3PlusRate === 0 ||
        highest.metrics.grade3PlusRate >= lowest.metrics.grade3PlusRate * 3);

    if (gradeRateDelta >= 0.08 || gradeRateRatioGap) {
      addFinding(
        findings,
        'arm-level-ae-imbalance',
        'high',
        'Grade 3+ adverse-event burden differs materially across study arms.',
        {
          highestArmId: highest.armId,
          lowestArmId: lowest.armId,
          highestRate: highest.metrics.grade3PlusRate,
          lowestRate: lowest.metrics.grade3PlusRate
        },
        'explain-arm-level-ae-imbalance'
      );
    }

    const sortedExposureRates = [...armReviews].sort(
      (left, right) => right.metrics.seriousAeExposureRate - left.metrics.seriousAeExposureRate
    );
    const exposureHighest = sortedExposureRates[0];
    const exposureLowest = sortedExposureRates[sortedExposureRates.length - 1];
    const exposureRateRatioGap =
      exposureHighest.metrics.seriousAeExposureRate > 0 &&
      (exposureLowest.metrics.seriousAeExposureRate === 0 ||
        exposureHighest.metrics.seriousAeExposureRate >=
          exposureLowest.metrics.seriousAeExposureRate * 3);

    if (
      exposureHighest.metrics.seriousAeExposureRate - exposureLowest.metrics.seriousAeExposureRate >= 0.04 ||
      exposureRateRatioGap
    ) {
      addFinding(
        findings,
        'exposure-adjusted-incidence-gap',
        'high',
        'Exposure-adjusted serious adverse-event incidence is not discussed across arms.',
        {
          highestArmId: exposureHighest.armId,
          lowestArmId: exposureLowest.armId,
          highestRate: exposureHighest.metrics.seriousAeExposureRate,
          lowestRate: exposureLowest.metrics.seriousAeExposureRate
        },
        'add-exposure-adjusted-safety-analysis'
      );
    }
  }

  const oversight = manuscript.oversight || {};
  if (!oversight.dsmbReviewLinked || oversight.irbFollowUpStatus !== 'complete') {
    addFinding(
      findings,
      'oversight-follow-up-missing',
      'high',
      'DSMB or IRB follow-up is not linked before safety language is marked ready.',
      {
        dsmbReviewLinked: Boolean(oversight.dsmbReviewLinked),
        irbFollowUpStatus: oversight.irbFollowUpStatus || 'missing'
      },
      'link-dsmb-or-irb-follow-up-before-ready'
    );
  }

  for (const claim of manuscript.claims || []) {
    const text = String(claim.text || '').toLowerCase();
    const maxLinkedGrade = findEventMaxGrade(arms, claim.linkedEventTerms);

    if (text.includes('grade 2 or lower') && maxLinkedGrade > 2) {
      addFinding(
        findings,
        'severity-grade-claim-mismatch',
        'critical',
        'Safety claim understates the highest linked adverse-event severity grade.',
        {
          claimId: claim.id,
          maxLinkedGrade
        },
        'revise-safety-claim-to-match-severity-grades'
      );
    }
  }

  if (
    hasDownplayingSafetyClaim(manuscript.claims) &&
    findings.some((finding) => finding.code !== 'claim-downplays-safety-uncertainty')
  ) {
    addFinding(
      findings,
      'claim-downplays-safety-uncertainty',
      'medium',
      'Manuscript wording downplays unresolved safety uncertainty.',
      {
        claimIds: (manuscript.claims || []).map((claim) => claim.id)
      },
      'qualify-safety-language-before-release'
    );
  }

  const decision = findings.length === 0 ? 'ready' : 'hold';
  const review = {
    manuscriptId: manuscript.id,
    title: manuscript.title,
    reviewDate: manuscript.reviewDate,
    decision,
    armCount: arms.length,
    holdCount: findings.length,
    armReviews,
    findings
  };

  return {
    ...review,
    digest: digest(review)
  };
}

function buildSafetyReviewPacket(manuscript, review) {
  return {
    manuscriptId: manuscript.id,
    title: manuscript.title,
    reviewDate: manuscript.reviewDate,
    summary: {
      decision: review.decision,
      findings: review.findings.length,
      arms: review.armCount
    },
    armReviews: review.armReviews,
    findings: review.findings,
    actions: [...new Set(review.findings.map((finding) => finding.action))],
    redactedOversightAuditLog: redactText(manuscript.oversight && manuscript.oversight.auditLog),
    digest: review.digest
  };
}

module.exports = {
  buildSafetyReviewPacket,
  reviewAdverseEventSafety
};
