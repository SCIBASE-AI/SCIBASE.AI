const crypto = require('crypto');

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
    .replace(/\b(?:\+?\d[\d\s().-]{6,}\d)\b/g, '[redacted-phone]');
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function coveredDomains(submission) {
  const domains = new Set();

  for (const entry of submission.codebook || []) {
    if (Number(entry.examples || 0) > 0) {
      domains.add(normalize(entry.domain));
    }
  }

  return domains;
}

function evaluateSubmission(study, submission) {
  const holds = [];
  const domains = coveredDomains(submission);
  const consentedTranscripts = new Set(study.consentedTranscriptIds || []);

  for (const domain of study.requiredDomains || []) {
    if (!domains.has(normalize(domain))) {
      holds.push(`missing-required-domain:${normalize(domain)}`);
    }
  }

  if (Number(submission.coderAgreement || 0) < Number(study.minimumCoderAgreement || 0)) {
    holds.push('coder-agreement-below-threshold');
  }

  if (Number(submission.saturationRounds || 0) < Number(study.minimumSaturationRounds || 0)) {
    holds.push('saturation-evidence-insufficient');
  }

  if (!String(submission.reflexivityMemo || '').trim()) {
    holds.push('missing-reflexivity-memo');
  }

  if (!submission.memberChecking || submission.memberChecking.completed !== true) {
    holds.push('member-checking-incomplete');
  }

  if (Number(submission.memberChecking && submission.memberChecking.unresolvedObjections) > 0) {
    holds.push('member-checking-objections-unresolved');
  }

  if ((submission.auditTrail || []).length < 2) {
    holds.push('audit-trail-incomplete');
  }

  for (const transcriptId of submission.transcriptIds || []) {
    if (!consentedTranscripts.has(transcriptId)) {
      holds.push(`unconsented-transcript:${transcriptId}`);
    }
  }

  const decision = holds.length === 0 ? 'ready' : 'hold';

  return {
    submissionId: submission.id,
    teamId: submission.team && submission.team.id,
    decision,
    holds,
    metrics: {
      codedDomains: Array.from(domains).sort(),
      coderAgreement: Number(submission.coderAgreement || 0),
      saturationRounds: Number(submission.saturationRounds || 0),
      auditTrailItems: (submission.auditTrail || []).length,
      transcriptCount: (submission.transcriptIds || []).length
    },
    actions: {
      releaseAssistantSummary: decision === 'ready',
      requestCodebookRevision: holds.some((hold) => hold.startsWith('missing-required-domain')),
      requestMethodologyReview: holds.length > 0,
      redactTranscriptQuotes: true
    }
  };
}

function reviewQualitativeReadiness(study) {
  const submissionReviews = (study.submissions || []).map((submission) =>
    evaluateSubmission(study, submission)
  );
  const readyCount = submissionReviews.filter((review) => review.decision === 'ready').length;
  const holdCount = submissionReviews.length - readyCount;
  const review = {
    studyId: study.id,
    title: study.title,
    requiredDomains: study.requiredDomains || [],
    minimumCoderAgreement: study.minimumCoderAgreement || 0,
    minimumSaturationRounds: study.minimumSaturationRounds || 0,
    readyCount,
    holdCount,
    submissionReviews
  };

  return {
    ...review,
    digest: digest(review)
  };
}

function buildReviewerPacket(study, review) {
  return {
    studyId: study.id,
    title: study.title,
    summary: {
      ready: review.readyCount,
      hold: review.holdCount
    },
    reviews: review.submissionReviews.map((item) => {
      const submission = (study.submissions || []).find((candidate) => candidate.id === item.submissionId);

      return {
        submissionId: item.submissionId,
        teamId: item.teamId,
        decision: item.decision,
        holds: item.holds,
        metrics: item.metrics,
        redactedQuotes: (submission && submission.rawTranscriptQuotes || []).map(redactText)
      };
    }),
    digest: review.digest
  };
}

module.exports = {
  buildReviewerPacket,
  reviewQualitativeReadiness
};
