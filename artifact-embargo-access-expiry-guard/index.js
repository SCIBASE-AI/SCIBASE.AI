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
    .replace(/token=[^\s]+/gi, 'token=[redacted]');
}

function dateValue(value) {
  return new Date(`${value}T00:00:00Z`).getTime();
}

function reviewArtifact(project, artifact) {
  const holds = [];
  const reviewTime = dateValue(project.reviewDate);

  if (artifact.publicReleaseRequested && dateValue(artifact.embargoEndsOn) > reviewTime) {
    holds.push('embargo-active');
  }

  for (const link of artifact.reviewerLinks || []) {
    if (link.revoked) {
      holds.push(`reviewer-link-revoked:${link.id}`);
    }

    if (dateValue(link.expiresOn) < reviewTime) {
      holds.push(`reviewer-link-expired:${link.id}`);
    }
  }

  if ((artifact.accessionEvidence || []).length === 0) {
    holds.push('missing-accession-evidence');
  }

  if (artifact.takedownRequest) {
    holds.push('active-takedown-request');
  }

  if (artifact.legalHold) {
    holds.push('legal-hold-active');
  }

  const decision = holds.length === 0 ? 'ready' : 'hold';

  return {
    artifactId: artifact.id,
    type: artifact.type,
    decision,
    holds,
    metrics: {
      reviewerLinkCount: (artifact.reviewerLinks || []).length,
      accessionEvidenceCount: (artifact.accessionEvidence || []).length,
      embargoEndsOn: artifact.embargoEndsOn,
      publicReleaseRequested: Boolean(artifact.publicReleaseRequested)
    },
    actions: {
      releasePublicExport: decision === 'ready',
      revokeExpiredLinks: holds.some((hold) => hold.startsWith('reviewer-link-expired')),
      routeToLegalReview: holds.includes('active-takedown-request') || holds.includes('legal-hold-active'),
      requireAccessionEvidence: holds.includes('missing-accession-evidence')
    }
  };
}

function reviewArtifactReleaseReadiness(project) {
  const artifactReviews = (project.artifacts || []).map((artifact) => reviewArtifact(project, artifact));
  const readyCount = artifactReviews.filter((review) => review.decision === 'ready').length;
  const holdCount = artifactReviews.length - readyCount;
  const review = {
    projectId: project.id,
    title: project.title,
    reviewDate: project.reviewDate,
    readyCount,
    holdCount,
    artifactReviews
  };

  return {
    ...review,
    digest: digest(review)
  };
}

function buildReleasePacket(project, review) {
  return {
    projectId: project.id,
    title: project.title,
    reviewDate: project.reviewDate,
    summary: {
      ready: review.readyCount,
      hold: review.holdCount
    },
    artifacts: review.artifactReviews.map((artifactReview) => {
      const artifact = (project.artifacts || []).find(
        (candidate) => candidate.id === artifactReview.artifactId
      );

      return {
        artifactId: artifactReview.artifactId,
        type: artifactReview.type,
        decision: artifactReview.decision,
        holds: artifactReview.holds,
        metrics: artifactReview.metrics,
        actions: artifactReview.actions,
        redactedAccessLog: redactText(artifact && artifact.accessLog)
      };
    }),
    digest: review.digest
  };
}

module.exports = {
  buildReleasePacket,
  reviewArtifactReleaseReadiness
};
