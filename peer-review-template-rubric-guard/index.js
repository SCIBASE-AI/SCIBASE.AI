const REQUIRED_DIMENSIONS = ['clarity', 'rigor', 'novelty', 'reproducibility'];
const REQUIRED_DECLARATIONS = ['conflictOfInterest', 'methodExpertise', 'dataAccess'];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return clean(value).toLowerCase();
}

function finding(type, severity, subject, message) {
  return {type, severity, subject, message};
}

function action(type, target, reason) {
  return {type, target, reason};
}

function dimensionNames(input) {
  return new Set(list(input.dimensions).map((dimension) => normalize(dimension.name)));
}

function validateRequiredDimensions(input, findings, curatorActions) {
  const names = dimensionNames(input);
  for (const required of REQUIRED_DIMENSIONS) {
    if (!names.has(required)) {
      findings.push(
        finding(
          'missing-required-rubric-dimension',
          'block',
          required,
          `Template is missing the required ${required} rubric dimension.`
        )
      );
      curatorActions.push(
        action(
          'add-rubric-dimension',
          required,
          `Add a ${required} scoring dimension before this peer-review template can affect reputation.`
        )
      );
    }
  }
}

function validateScoreScales(input, findings, curatorActions) {
  for (const dimension of list(input.dimensions)) {
    const scale = dimension.scoreScale || {};
    const min = Number(scale.min);
    const max = Number(scale.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 10 || min >= max) {
      findings.push(
        finding(
          'score-scale-out-of-bounds',
          'block',
          dimension.name || 'unknown dimension',
          `${dimension.name || 'Rubric dimension'} uses score scale ${scale.min}..${scale.max}, outside the supported 0..10 increasing range.`
        )
      );
      curatorActions.push(
        action(
          'normalize-score-scale',
          dimension.name || 'unknown dimension',
          'Use an increasing numeric score scale within 0..10 so reputation deltas are comparable.'
        )
      );
    }
  }
}

function validateEvidenceAnchors(input, findings, curatorActions) {
  const coveredArtifacts = new Set();
  for (const dimension of list(input.dimensions)) {
    for (const anchor of list(dimension.evidenceAnchors)) {
      coveredArtifacts.add(normalize(anchor));
    }
  }

  for (const artifactType of list(input.reviewedArtifactTypes)) {
    if (!coveredArtifacts.has(normalize(artifactType))) {
      findings.push(
        finding(
          'evidence-anchor-missing',
          'block',
          artifactType,
          `No rubric dimension requires evidence anchored to ${artifactType}.`
        )
      );
      curatorActions.push(
        action(
          'add-evidence-anchor',
          artifactType,
          `Require at least one scoring dimension to cite ${artifactType} evidence before profile or timeline credit is computed.`
        )
      );
    }
  }
}

function validateReviewMode(input, findings, curatorActions) {
  const visibility = normalize(input.visibilityMode);
  const mode = input.reviewMode || {};
  const requiresBlindSafety = visibility.includes('blind') || visibility.includes('anonymous');
  const safeLabel = !['real-name', 'public-name'].includes(normalize(mode.anonymousLabelPolicy));
  if (requiresBlindSafety && (!mode.authorIdentityHidden || !mode.reviewerIdentityHidden || !safeLabel)) {
    findings.push(
      finding(
        'anonymous-mode-privacy-gap',
        'review',
        input.visibilityMode || 'review mode',
        'Anonymous or blind review mode does not hide both author and reviewer identities with a safe label policy.'
      )
    );
    curatorActions.push(
      action(
        'repair-review-mode-privacy',
        input.templateId || 'template',
        'Hide author and reviewer identities and replace real-name labels before publishing review receipts.'
      )
    );
  }
}

function validateReviewerDeclarations(input, findings, curatorActions) {
  const declarations = input.reviewerDeclarations || {};
  for (const declaration of REQUIRED_DECLARATIONS) {
    if (declarations[declaration] !== true) {
      findings.push(
        finding(
          'reviewer-declaration-incomplete',
          'review',
          declaration,
          `Reviewer declaration ${declaration} must be completed before reputation deltas are trusted.`
        )
      );
      curatorActions.push(
        action(
          'complete-reviewer-declaration',
          declaration,
          'Require reviewer attestations before template output affects profiles or leaderboards.'
        )
      );
    }
  }
}

function validateProfilePacket(input, findings, curatorActions) {
  const targets = new Set(list(input.publicationTargets).map(normalize));
  const packet = input.profilePacket || {};
  const needsProfileSafety = targets.has('reviewer-profile') || targets.has('citation-page');
  if (needsProfileSafety && (!packet.includesRubricVersion || !packet.redactsAnonymousIdentities)) {
    findings.push(
      finding(
        'profile-publication-packet-incomplete',
        'review',
        input.templateId || 'template',
        'Profile or citation-page publication packet must include rubric versioning and anonymous identity redaction.'
      )
    );
    curatorActions.push(
      action(
        'complete-profile-publication-packet',
        input.templateId || 'template',
        'Include rubric version metadata and anonymous identity redaction before profile or citation publication.'
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

function evaluatePeerReviewTemplateRubric(input = {}) {
  const findings = [];
  const curatorActions = [];

  validateRequiredDimensions(input, findings, curatorActions);
  validateScoreScales(input, findings, curatorActions);
  validateEvidenceAnchors(input, findings, curatorActions);
  validateReviewMode(input, findings, curatorActions);
  validateReviewerDeclarations(input, findings, curatorActions);
  validateProfilePacket(input, findings, curatorActions);

  const summary = summarize(findings);
  const decision = summary.blockingFindingCount > 0
    ? 'hold-template'
    : summary.reviewFindingCount > 0
      ? 'curator-review'
      : 'publish-template';
  const profileUnsafeFindingTypes = new Set(['anonymous-mode-privacy-gap', 'profile-publication-packet-incomplete']);
  const profileSafe = !findings.some((item) => profileUnsafeFindingTypes.has(item.type));

  return {
    generatedAt: input.generatedAt || new Date(0).toISOString(),
    templateId: input.templateId || 'unknown-template',
    discipline: input.discipline || 'unknown-discipline',
    decision,
    summary,
    findings,
    curatorActions,
    templatePacket: {
      templateId: input.templateId || 'unknown-template',
      discipline: input.discipline || 'unknown-discipline',
      decision,
      profileSafe,
      rubricScore: Math.max(0, 100 - summary.blockingFindingCount * 15 - summary.reviewFindingCount * 8),
      requiredDimensions: REQUIRED_DIMENSIONS,
      reviewedArtifactTypes: list(input.reviewedArtifactTypes),
      publicationTargets: list(input.publicationTargets),
    },
  };
}

function buildRubricGuardPacket(result) {
  const lines = [
    `# Peer Review Template Rubric Guard: ${result.templateId}`,
    '',
    `Discipline: ${result.discipline}`,
    `Decision: ${result.decision}`,
    `Generated: ${result.generatedAt}`,
    `Rubric score: ${result.templatePacket.rubricScore}`,
    `Profile safe: ${result.templatePacket.profileSafe}`,
    '',
    '## Findings',
  ];

  if (result.findings.length === 0) {
    lines.push('- None');
  } else {
    for (const item of result.findings) {
      lines.push(`- ${item.type}: ${item.subject} - ${item.message}`);
    }
  }

  lines.push('', '## Curator Actions');
  if (result.curatorActions.length === 0) {
    lines.push('- No curator action required');
  } else {
    for (const item of result.curatorActions) {
      lines.push(`- ${item.type}: ${item.target} - ${item.reason}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  evaluatePeerReviewTemplateRubric,
  buildRubricGuardPacket,
};
