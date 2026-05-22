function list(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return clean(value).toLowerCase();
}

function normalizeDoi(value) {
  return normalize(value)
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:/, '');
}

function normalizePmid(value) {
  return normalize(value).replace(/^pmid:/, '');
}

function finding(type, severity, target, message) {
  return {type, severity, target, message};
}

function remediation(type, target, reason) {
  return {type, target, reason};
}

function referenceLabel(reference) {
  return reference.id || reference.citationKey || 'unknown-reference';
}

function referenceIdentifiers(reference) {
  const identifiers = [];
  const doi = normalizeDoi(reference.doi);
  const pmid = normalizePmid(reference.pmid);
  if (doi) {
    identifiers.push({type: 'doi', value: doi, label: reference.doi});
  }
  if (pmid) {
    identifiers.push({type: 'pmid', value: pmid, label: reference.pmid});
  }
  return identifiers;
}

function collectBy(items, keyFn) {
  const buckets = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) {
      continue;
    }
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(item);
  }
  return buckets;
}

function validateDuplicateIdentifiers(references, findings, remediationPlan) {
  const identifierRefs = new Map();
  for (const reference of references) {
    for (const identifier of referenceIdentifiers(reference)) {
      const key = `${identifier.type}:${identifier.value}`;
      if (!identifierRefs.has(key)) {
        identifierRefs.set(key, []);
      }
      identifierRefs.get(key).push({reference, identifier});
    }
  }

  for (const [key, entries] of identifierRefs.entries()) {
    const uniqueIds = new Set(entries.map((entry) => referenceLabel(entry.reference)));
    if (uniqueIds.size <= 1) {
      continue;
    }
    const labels = [...uniqueIds].join(', ');
    const identifier = entries[0].identifier.label || key.split(':').slice(1).join(':');
    findings.push(
      finding(
        'duplicate-source-identifier',
        'block',
        key,
        `References ${labels} share source identifier ${identifier}.`
      )
    );
    remediationPlan.push(
      remediation(
        'deduplicate-source-record',
        key,
        `Merge or remove duplicate reference records for ${identifier} before syncing the collaborative library.`
      )
    );
  }
}

function validateCitationKeyCollisions(references, findings, remediationPlan) {
  const byKey = collectBy(references, (reference) => normalize(reference.citationKey));
  for (const [key, refs] of byKey.entries()) {
    const uniqueIds = new Set(refs.map(referenceLabel));
    if (uniqueIds.size <= 1) {
      continue;
    }
    const labels = [...uniqueIds].join(', ');
    findings.push(
      finding(
        'citation-key-collision',
        'block',
        key,
        `Citation key ${refs[0].citationKey} points to multiple references: ${labels}.`
      )
    );
    remediationPlan.push(
      remediation(
        'rename-citation-key',
        key,
        `Assign unique citation keys for ${labels} and update manuscript anchors before export.`
      )
    );
  }
}

function validateCitationAnchors(references, citations, findings, remediationPlan) {
  const keys = new Set(references.map((reference) => normalize(reference.citationKey)).filter(Boolean));
  for (const citation of citations) {
    const key = normalize(citation.citationKey);
    if (!key || keys.has(key)) {
      continue;
    }
    const target = citation.anchorId || citation.citationKey || 'unknown-anchor';
    findings.push(
      finding(
        'stale-citation-anchor',
        'block',
        target,
        `Citation anchor ${target} references ${citation.citationKey || 'missing key'}, which is absent from the merged library.`
      )
    );
    remediationPlan.push(
      remediation(
        'repair-citation-anchor',
        target,
        `Reconnect ${target} to an active reference key or remove the stale in-text citation before export.`
      )
    );
  }
}

function validateLockedEdits(references, proposedEdits, findings, remediationPlan) {
  const byId = new Map(references.map((reference) => [reference.id, reference]));
  for (const edit of proposedEdits) {
    const reference = byId.get(edit.referenceId);
    if (!reference?.locked || list(edit.changedFields).length === 0) {
      continue;
    }
    const target = edit.referenceId || 'unknown-reference';
    findings.push(
      finding(
        'locked-reference-edit',
        'block',
        target,
        `Locked reference ${target} has proposed changes to ${list(edit.changedFields).join(', ')}.`
      )
    );
    remediationPlan.push(
      remediation(
        'review-locked-reference-edit',
        target,
        `Require reference owner approval before applying locked ${target} edits from ${edit.editor || 'unknown editor'}.`
      )
    );
  }
}

function hasBibliographicCore(reference) {
  return Boolean(clean(reference.title)) && list(reference.authors).length > 0 && Boolean(reference.year);
}

function validateSourceMetadata(references, findings, remediationPlan) {
  for (const reference of references) {
    const identifiers = referenceIdentifiers(reference);
    if (identifiers.length > 0 && hasBibliographicCore(reference)) {
      continue;
    }
    const target = referenceLabel(reference);
    findings.push(
      finding(
        'missing-source-metadata',
        'review',
        target,
        `Reference ${target} is missing DOI/PMID or core title, author, and year metadata.`
      )
    );
    remediationPlan.push(
      remediation(
        'complete-source-metadata',
        target,
        `Complete DOI/PMID plus title, author, and year metadata for ${target} before final manuscript export.`
      )
    );
  }
}

function validateReferenceConflicts(references, findings, remediationPlan) {
  for (const reference of references) {
    if (!reference.conflict) {
      continue;
    }
    const target = referenceLabel(reference);
    findings.push(
      finding(
        'unresolved-reference-conflict',
        'review',
        target,
        `Reference ${target} still has an unresolved merge conflict from a collaborator library import.`
      )
    );
    remediationPlan.push(
      remediation(
        'resolve-reference-conflict',
        target,
        `Pick the winning source metadata for ${target} and record the merge decision before export.`
      )
    );
  }
}

function summarize(findings) {
  const blockingFindingCount = findings.filter((item) => item.severity === 'block').length;
  const reviewFindingCount = findings.filter((item) => item.severity !== 'block').length;
  return {
    findingCount: findings.length,
    blockingFindingCount,
    reviewFindingCount,
  };
}

function decide(summary) {
  if (summary.blockingFindingCount > 0) {
    return 'hold-export';
  }
  if (summary.reviewFindingCount > 0) {
    return 'merge-review';
  }
  return 'export-ready';
}

function visibleAndGated(actionsRequested, decision) {
  const requested = list(actionsRequested);
  if (decision === 'export-ready') {
    return {visibleActions: requested, gatedActions: []};
  }
  if (decision === 'merge-review') {
    return {
      visibleActions: requested.filter((action) => action !== 'export-manuscript'),
      gatedActions: requested.filter((action) => action === 'export-manuscript'),
    };
  }
  return {
    visibleActions: requested.filter((action) => action === 'notify-collaborators'),
    gatedActions: requested.filter((action) => action !== 'notify-collaborators'),
  };
}

function evaluateReferenceLibraryMerge(input = {}) {
  const generatedAt = input.generatedAt || new Date(0).toISOString();
  const references = list(input.references);
  const findings = [];
  const remediationPlan = [];

  validateDuplicateIdentifiers(references, findings, remediationPlan);
  validateCitationKeyCollisions(references, findings, remediationPlan);
  validateCitationAnchors(references, list(input.citations), findings, remediationPlan);
  validateLockedEdits(references, list(input.proposedEdits), findings, remediationPlan);
  validateSourceMetadata(references, findings, remediationPlan);
  validateReferenceConflicts(references, findings, remediationPlan);

  const summary = summarize(findings);
  const decision = decide(summary);
  const {visibleActions, gatedActions} = visibleAndGated(input.actionsRequested, decision);

  return {
    generatedAt,
    manuscriptId: input.manuscriptId || 'unknown-manuscript',
    libraryRevision: input.libraryRevision || 'unknown-revision',
    decision,
    summary,
    findings,
    remediationPlan,
    visibleActions,
    gatedActions,
    reviewerPacket: {
      manuscriptId: input.manuscriptId || 'unknown-manuscript',
      libraryRevision: input.libraryRevision || 'unknown-revision',
      referenceCount: references.length,
      citationCount: list(input.citations).length,
      decision,
      gatedActions,
      visibleActions,
    },
  };
}

function buildReferenceMergePacket(result) {
  const lines = [
    `# Collaborative Reference Merge Guard: ${result.manuscriptId}`,
    '',
    `Library revision: ${result.libraryRevision}`,
    `Decision: ${result.decision}`,
    `Generated: ${result.generatedAt}`,
    `References: ${result.reviewerPacket.referenceCount}`,
    `Citation anchors: ${result.reviewerPacket.citationCount}`,
    '',
    '## Visible Actions',
  ];

  if (result.visibleActions.length === 0) {
    lines.push('- None');
  } else {
    for (const action of result.visibleActions) {
      lines.push(`- ${action}`);
    }
  }

  lines.push('', '## Gated Actions');
  if (result.gatedActions.length === 0) {
    lines.push('- None');
  } else {
    for (const action of result.gatedActions) {
      lines.push(`- ${action}`);
    }
  }

  lines.push('', '## Findings');
  if (result.findings.length === 0) {
    lines.push('- None');
  } else {
    for (const item of result.findings) {
      lines.push(`- ${item.type}: ${item.target} - ${item.message}`);
    }
  }

  lines.push('', '## Remediation Plan');
  if (result.remediationPlan.length === 0) {
    lines.push('- No remediation required');
  } else {
    for (const item of result.remediationPlan) {
      lines.push(`- ${item.type}: ${item.target} - ${item.reason}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  evaluateReferenceLibraryMerge,
  buildReferenceMergePacket,
};
