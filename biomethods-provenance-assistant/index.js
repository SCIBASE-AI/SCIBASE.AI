function list(value) {
  return Array.isArray(value) ? value : [];
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function fullDaysBetween(older, newer) {
  const olderTime = Date.parse(older);
  const newerTime = Date.parse(newer);
  if (!Number.isFinite(olderTime) || !Number.isFinite(newerTime)) {
    return Infinity;
  }
  return Math.floor((newerTime - olderTime) / 86400000);
}

function reviewerAction(type, target, reason) {
  return {type, target, reason};
}

function addFinding(findings, requiredActions, finding, action) {
  findings.push(finding);
  if (action) {
    requiredActions.push(action);
  }
}

function reagentKey(reagent) {
  return [
    reagent.vendor || 'unknown-vendor',
    reagent.catalogNumber || reagent.name || reagent.id || 'unknown-reagent',
  ].join('::').toLowerCase();
}

function countSeverities(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {critical: 0, major: 0, minor: 0});
}

function evaluateSpecimen(specimen, findings, requiredActions) {
  const target = specimen.id || specimen.label || 'specimen';

  if (!hasText(specimen.source)) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'missing-specimen-source',
        severity: 'critical',
        target,
        message: `${target} is missing source, accession, facility, or cohort provenance`,
      },
      reviewerAction(
        'request_specimen_source',
        target,
        'reviewers need specimen origin provenance before trusting biomethods claims'
      )
    );
  }

  const missingContext = ['organism', 'strain', 'sex', 'age']
    .filter((field) => !hasText(specimen[field]));
  if (missingContext.length > 0) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'missing-specimen-context',
        severity: 'major',
        target,
        missingContext,
        message: `${target} lacks biological context fields: ${missingContext.join(', ')}`,
      },
      reviewerAction(
        'request_specimen_context',
        target,
        'organism, strain, sex, and age context are needed for biology peer-review templates'
      )
    );
  }
}

function evaluateCellLine(cellLine, generatedAt, findings, requiredActions) {
  const target = cellLine.id || cellLine.name || 'cell-line';
  if (!hasText(cellLine.source)) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'missing-cell-line-source',
        severity: 'major',
        target,
        message: `${target} is missing source or repository provenance`,
      },
      reviewerAction(
        'record_cell_line_source',
        target,
        'cell-line source must be traceable for reproducibility and contamination checks'
      )
    );
  }

  if (!hasText(cellLine.authenticatedAt) || !hasText(cellLine.authenticationMethod)) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'missing-cell-line-authentication',
        severity: 'critical',
        target,
        message: `${target} lacks authentication date or method evidence`,
      },
      reviewerAction(
        'provide_cell_line_authentication',
        target,
        'cell-line identity needs authentication evidence before review release'
      )
    );
  } else if (fullDaysBetween(cellLine.authenticatedAt, generatedAt) > 365) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'stale-cell-line-authentication',
        severity: 'critical',
        target,
        authenticatedAt: cellLine.authenticatedAt,
        message: `${target} authentication evidence is older than 365 days`,
      },
      reviewerAction(
        'refresh_cell_line_authentication',
        target,
        'stale identity evidence can invalidate downstream biological conclusions'
      )
    );
  }

  if (!hasText(cellLine.mycoplasmaTestedAt)) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'missing-mycoplasma-evidence',
        severity: 'major',
        target,
        message: `${target} lacks mycoplasma test evidence`,
      },
      reviewerAction(
        'provide_mycoplasma_test',
        target,
        'cell-culture studies need contamination-screening evidence'
      )
    );
  }
}

function evaluateReagent(reagent, findings, requiredActions) {
  const target = reagent.id || reagent.name || 'reagent';
  if (!hasText(reagent.vendor) || !hasText(reagent.catalogNumber)) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'missing-reagent-identifier',
        severity: 'major',
        target,
        message: `${target} lacks vendor or catalog-number traceability`,
      },
      reviewerAction(
        'record_reagent_identifier',
        target,
        'critical reagents need vendor and catalog identifiers for repeatability'
      )
    );
  }

  if (!hasText(reagent.lot)) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'missing-reagent-lot',
        severity: 'major',
        target,
        message: `${target} lacks batch or lot evidence`,
      },
      reviewerAction(
        'record_reagent_lot',
        target,
        'batch-sensitive assays need lot traceability before peer review'
      )
    );
  }

  if (String(reagent.type || '').toLowerCase() === 'antibody' && !hasText(reagent.rrid)) {
    addFinding(
      findings,
      requiredActions,
      {
        type: 'missing-antibody-rrid',
        severity: 'major',
        target,
        message: `${target} is an antibody without RRID evidence`,
      },
      reviewerAction(
        'record_antibody_rrid',
        target,
        'antibody-based claims need RRID evidence for reviewer verification'
      )
    );
  }
}

function evaluateBatchConflicts(reagents, findings, requiredActions) {
  const groups = new Map();
  for (const reagent of reagents) {
    if (!hasText(reagent.lot) || !hasText(reagent.vendor) || !hasText(reagent.catalogNumber)) {
      continue;
    }
    const key = reagentKey(reagent);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(reagent);
  }

  for (const entries of groups.values()) {
    const lots = [...new Set(entries.map((entry) => entry.lot))].sort();
    if (lots.length < 2) {
      continue;
    }
    const target = entries[0].catalogNumber || entries[0].name;
    addFinding(
      findings,
      requiredActions,
      {
        type: 'reagent-batch-conflict',
        severity: 'major',
        target,
        lots,
        methodSections: entries.map((entry) => entry.methodSection).filter(hasText),
        message: `${target} appears with multiple lots without batch-effect notes`,
      },
      reviewerAction(
        'explain_reagent_batch_handling',
        target,
        'multi-lot reagents need batch-effect handling before claims are compared'
      )
    );
  }
}

function decide(findings) {
  if (findings.some((finding) => finding.severity === 'critical')) {
    return 'hold-for-author-response';
  }
  if (findings.some((finding) => finding.severity === 'major')) {
    return 'needs-provenance-review';
  }
  return 'ready-for-review';
}

function evaluateBiomethodsProvenance(input) {
  const findings = [];
  const requiredActions = [];
  const generatedAt = input.generatedAt || new Date(0).toISOString();
  const specimens = list(input.specimens);
  const cellLines = list(input.cellLines);
  const reagents = list(input.reagents);

  for (const specimen of specimens) {
    evaluateSpecimen(specimen, findings, requiredActions);
  }
  for (const cellLine of cellLines) {
    evaluateCellLine(cellLine, generatedAt, findings, requiredActions);
  }
  for (const reagent of reagents) {
    evaluateReagent(reagent, findings, requiredActions);
  }
  evaluateBatchConflicts(reagents, findings, requiredActions);

  const summary = {
    ...countSeverities(findings),
    specimens: specimens.length,
    cellLines: cellLines.length,
    reagents: reagents.length,
    findings: findings.length,
  };

  return {
    manuscriptId: input.manuscriptId || 'unknown-manuscript',
    generatedAt,
    decision: decide(findings),
    summary,
    findings,
    requiredActions,
  };
}

function buildReviewerReport(result) {
  const lines = [
    '# Biomethods Provenance Assistant',
    '',
    `Manuscript: ${result.manuscriptId}`,
    `Decision: ${result.decision}`,
    `Generated: ${result.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Critical findings: ${result.summary.critical || 0}`,
    `- Major findings: ${result.summary.major || 0}`,
    `- Minor findings: ${result.summary.minor || 0}`,
    `- Specimens checked: ${result.summary.specimens || 0}`,
    `- Cell lines checked: ${result.summary.cellLines || 0}`,
    `- Reagents checked: ${result.summary.reagents || 0}`,
    '',
  ];

  if (result.findings.length === 0) {
    lines.push('No blocking biomethods provenance gaps detected.');
  } else {
    lines.push('## Findings', '');
    for (const finding of result.findings) {
      lines.push(`- **${finding.severity}** ${finding.type}: ${finding.message}`);
    }
    lines.push('', '## Required Actions', '');
    for (const action of result.requiredActions) {
      lines.push(`- ${action.type} (${action.target}): ${action.reason}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  evaluateBiomethodsProvenance,
  buildReviewerReport,
};
