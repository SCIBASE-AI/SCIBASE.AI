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

function exportProfile(workspace, document) {
  return workspace.exportProfiles[document.exportProfile] || {
    allowedVisibilities: ['public'],
    requireResolvedThreads: true
  };
}

function reviewThread(thread, profile, invitedReviewerIds) {
  const holds = [];
  const allowed = new Set(profile.allowedVisibilities || ['public']);
  const invited = new Set(invitedReviewerIds || []);

  if (!allowed.has(thread.visibility)) {
    holds.push(`visibility-not-allowed:${thread.id}:${thread.visibility}`);
  }

  if (profile.requireResolvedThreads && thread.resolved !== true) {
    holds.push(`unresolved-thread:${thread.id}`);
  }

  for (const mention of thread.mentions || []) {
    if (!invited.has(mention)) {
      holds.push(`uninvited-mention:${thread.id}:${mention}`);
    }
  }

  return holds;
}

function reviewDocument(workspace, document) {
  const profile = exportProfile(workspace, document);
  const holds = [];

  for (const thread of document.threads || []) {
    holds.push(...reviewThread(thread, profile, workspace.invitedReviewerIds));
  }

  if ((document.inlineAnnotations || []).some((annotation) => annotation.kind === 'sensitive-inline')) {
    holds.push('sensitive-inline-annotation');
  }

  if (holds.length > 0 && (document.redactionEvidence || []).length === 0) {
    holds.push('missing-redaction-evidence');
  }

  const decision = holds.length === 0 ? 'ready' : 'hold';

  return {
    documentId: document.id,
    exportProfile: document.exportProfile,
    decision,
    holds,
    metrics: {
      threadCount: (document.threads || []).length,
      privateThreadCount: (document.threads || []).filter((thread) => thread.visibility !== 'public').length,
      unresolvedThreadCount: (document.threads || []).filter((thread) => thread.resolved !== true).length,
      inlineAnnotationCount: (document.inlineAnnotations || []).length
    },
    actions: {
      releaseExport: decision === 'ready',
      redactPrivateThreads: holds.some((hold) => hold.startsWith('visibility-not-allowed')),
      requireCommentResolution: holds.some((hold) => hold.startsWith('unresolved-thread')),
      notifyWorkspaceAdmins: holds.length > 0
    }
  };
}

function reviewExportCommentPrivacy(workspace) {
  const documentReviews = (workspace.documents || []).map((document) =>
    reviewDocument(workspace, document)
  );
  const readyCount = documentReviews.filter((review) => review.decision === 'ready').length;
  const holdCount = documentReviews.length - readyCount;
  const review = {
    workspaceId: workspace.id,
    title: workspace.title,
    readyCount,
    holdCount,
    documentReviews
  };

  return {
    ...review,
    digest: digest(review)
  };
}

function buildExportPacket(workspace, review) {
  return {
    workspaceId: workspace.id,
    title: workspace.title,
    summary: {
      ready: review.readyCount,
      hold: review.holdCount
    },
    documents: review.documentReviews.map((documentReview) => {
      const document = (workspace.documents || []).find(
        (candidate) => candidate.id === documentReview.documentId
      );

      return {
        documentId: documentReview.documentId,
        exportProfile: documentReview.exportProfile,
        decision: documentReview.decision,
        holds: documentReview.holds,
        metrics: documentReview.metrics,
        redactedThreadText: (document && document.threads || []).map((thread) => ({
          threadId: thread.id,
          visibility: thread.visibility,
          text: redactText(thread.text)
        }))
      };
    }),
    digest: review.digest
  };
}

module.exports = {
  buildExportPacket,
  reviewExportCommentPrivacy
};
