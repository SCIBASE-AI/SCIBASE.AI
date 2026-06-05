const ACCEPTED_LICENSES = new Set(['cc-by-4.0', 'cc0-1.0', 'mit', 'apache-2.0', 'institutional-approved']);
const REQUIRED_APPROVAL_ROLES = ['corresponding-author', 'data-steward'];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value || '').trim();
}

function idSet(values) {
  return new Set(list(values).map((value) => text(value)).filter(Boolean));
}

function addFinding(findings, severity, code, message, remediation, supplementId) {
  findings.push({ severity, code, supplementId, message, remediation });
}

function approvalRoles(supplement) {
  return new Set(list(supplement.approvals).filter((approval) => approval.approved).map((approval) => approval.role));
}

function blockingCommentsFor(comments, supplementId) {
  return list(comments).filter((comment) => (
    comment.supplementId === supplementId
    && comment.blocking
    && comment.status !== 'resolved'
  ));
}

export function evaluateSupplementaryExport(packet) {
  const findings = [];
  const referencedIds = idSet(packet.manuscript?.supplementReferences);
  const supplements = list(packet.supplements);
  const comments = list(packet.comments);

  for (const supplement of supplements) {
    const supplementId = text(supplement.id);
    const roles = approvalRoles(supplement);
    const missingRoles = REQUIRED_APPROVAL_ROLES.filter((role) => !roles.has(role));
    const unresolved = blockingCommentsFor(comments, supplementId);

    if (!referencedIds.has(supplementId)) {
      addFinding(
        findings,
        'blocker',
        'unreferenced-supplement',
        `Supplement ${supplementId} is present in the export packet but not cited by the manuscript.`,
        'Add a stable manuscript citation for the supplement or remove it from the export bundle.',
        supplementId
      );
    }

    if (text(supplement.sourceHash) !== text(supplement.exportHash)) {
      addFinding(
        findings,
        'blocker',
        'stale-export-hash',
        `Supplement ${supplementId} export hash does not match the current source hash.`,
        'Regenerate the exported supplement from the current source artifact before publication export.',
        supplementId
      );
    }

    if (supplement.generatedFromNotebook && !supplement.notebookExecutionFresh) {
      addFinding(
        findings,
        'blocker',
        'stale-notebook-output',
        `Supplement ${supplementId} was generated from a notebook with stale or missing execution evidence.`,
        'Re-run the notebook, attach the execution digest, and rebuild the supplement export.',
        supplementId
      );
    }

    if (supplement.containsRestrictedData && !supplement.redactionReview?.approved) {
      addFinding(
        findings,
        'blocker',
        'missing-redaction-review',
        `Supplement ${supplementId} contains restricted data without an approved redaction review.`,
        'Hold export until restricted fields are redacted and the data steward approves the redaction review.',
        supplementId
      );
    }

    if (supplement.privateReviewerNotesIncluded) {
      addFinding(
        findings,
        'blocker',
        'private-reviewer-note-leak',
        `Supplement ${supplementId} includes private reviewer or collaborator notes in the public export.`,
        'Strip private notes from the export bundle and regenerate the artifact manifest.',
        supplementId
      );
    }

    if (unresolved.length > 0) {
      addFinding(
        findings,
        'blocker',
        'unresolved-blocking-comment',
        `Supplement ${supplementId} has ${unresolved.length} unresolved blocking comment(s).`,
        'Resolve or explicitly waive blocking supplement comments before export.',
        supplementId
      );
    }

    if (!ACCEPTED_LICENSES.has(text(supplement.license).toLowerCase())) {
      addFinding(
        findings,
        'warning',
        'license-needs-review',
        `Supplement ${supplementId} has missing or unsupported license metadata.`,
        'Attach an approved publication license or route the supplement for institutional licensing review.',
        supplementId
      );
    }

    if (missingRoles.length > 0) {
      addFinding(
        findings,
        'warning',
        'missing-export-approval',
        `Supplement ${supplementId} is missing export approval from: ${missingRoles.join(', ')}.`,
        'Collect the missing collaborator approvals before marking the manuscript export-ready.',
        supplementId
      );
    }

    if (!supplement.lockedAtExport) {
      addFinding(
        findings,
        'warning',
        'unlocked-supplement-section',
        `Supplement ${supplementId} remains editable while the export packet is being prepared.`,
        'Lock the supplement section or create a named version snapshot before export.',
        supplementId
      );
    }
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  return {
    manuscriptId: packet.manuscript?.id,
    supplementCount: supplements.length,
    decision: blockers.length > 0 ? 'hold' : warnings.length > 0 ? 'revise' : 'export-ready',
    blockers: blockers.length,
    warnings: warnings.length,
    findings,
  };
}

export function buildSupplementManifest(packet, evaluation) {
  return {
    generatedAt: '2026-06-05T15:10:00.000Z',
    manuscriptId: evaluation.manuscriptId,
    decision: evaluation.decision,
    supplements: list(packet.supplements).map((supplement) => ({
      id: supplement.id,
      type: supplement.type,
      sourceHash: supplement.sourceHash,
      exportHash: supplement.exportHash,
      referenced: idSet(packet.manuscript?.supplementReferences).has(supplement.id),
      lockedAtExport: Boolean(supplement.lockedAtExport),
      license: supplement.license || null,
    })),
    findings: evaluation.findings,
  };
}

export const samplePackets = {
  blocked: {
    manuscript: {
      id: 'ms-collab-neuro-042',
      supplementReferences: ['supp-figure-1', 'supp-table-2'],
    },
    supplements: [
      {
        id: 'supp-figure-1',
        type: 'figure-panel',
        sourceHash: 'sha256:figure-current',
        exportHash: 'sha256:figure-current',
        generatedFromNotebook: true,
        notebookExecutionFresh: true,
        containsRestrictedData: false,
        redactionReview: { approved: true },
        privateReviewerNotesIncluded: false,
        license: 'CC-BY-4.0',
        lockedAtExport: true,
        approvals: [
          { role: 'corresponding-author', approved: true },
          { role: 'data-steward', approved: true },
        ],
      },
      {
        id: 'supp-table-2',
        type: 'csv-table',
        sourceHash: 'sha256:table-current',
        exportHash: 'sha256:table-stale',
        generatedFromNotebook: true,
        notebookExecutionFresh: false,
        containsRestrictedData: true,
        redactionReview: { approved: false },
        privateReviewerNotesIncluded: true,
        license: '',
        lockedAtExport: false,
        approvals: [{ role: 'corresponding-author', approved: true }],
      },
      {
        id: 'supp-protocol-3',
        type: 'protocol-pdf',
        sourceHash: 'sha256:protocol-current',
        exportHash: 'sha256:protocol-current',
        generatedFromNotebook: false,
        notebookExecutionFresh: true,
        containsRestrictedData: false,
        redactionReview: { approved: true },
        privateReviewerNotesIncluded: false,
        license: 'institutional-approved',
        lockedAtExport: true,
        approvals: [
          { role: 'corresponding-author', approved: true },
          { role: 'data-steward', approved: true },
        ],
      },
    ],
    comments: [
      { supplementId: 'supp-table-2', blocking: true, status: 'open' },
      { supplementId: 'supp-figure-1', blocking: false, status: 'open' },
    ],
  },
  ready: {
    manuscript: {
      id: 'ms-collab-neuro-042',
      supplementReferences: ['supp-figure-1', 'supp-table-2'],
    },
    supplements: [
      {
        id: 'supp-figure-1',
        type: 'figure-panel',
        sourceHash: 'sha256:figure-current',
        exportHash: 'sha256:figure-current',
        generatedFromNotebook: true,
        notebookExecutionFresh: true,
        containsRestrictedData: false,
        redactionReview: { approved: true },
        privateReviewerNotesIncluded: false,
        license: 'cc-by-4.0',
        lockedAtExport: true,
        approvals: [
          { role: 'corresponding-author', approved: true },
          { role: 'data-steward', approved: true },
        ],
      },
      {
        id: 'supp-table-2',
        type: 'csv-table',
        sourceHash: 'sha256:table-current',
        exportHash: 'sha256:table-current',
        generatedFromNotebook: true,
        notebookExecutionFresh: true,
        containsRestrictedData: true,
        redactionReview: { approved: true },
        privateReviewerNotesIncluded: false,
        license: 'cc0-1.0',
        lockedAtExport: true,
        approvals: [
          { role: 'corresponding-author', approved: true },
          { role: 'data-steward', approved: true },
        ],
      },
    ],
    comments: [
      { supplementId: 'supp-table-2', blocking: true, status: 'resolved' },
    ],
  },
};
