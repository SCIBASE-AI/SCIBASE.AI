function list(value) {
  return Array.isArray(value) ? value : [];
}

function action(type, target, reason) {
  return {type, target, reason};
}

function unique(values) {
  return [...new Set(values)];
}

function contributorName(contributorsById, contributorId) {
  return contributorsById.get(contributorId)?.name || contributorId;
}

function evaluateContributionCredit(input) {
  const contributors = list(input.contributors);
  const statements = list(input.creditStatements);
  const artifacts = list(input.projectArtifacts);
  const contributorsById = new Map(contributors.map((contributor) => [contributor.id, contributor]));
  const statementsById = new Map(statements.map((statement) => [statement.contributorId, statement]));
  const blockers = [];
  const requiredActions = [];

  const artifactContributorIds = unique(artifacts.flatMap((artifact) => list(artifact.touchedBy)));

  for (const statement of statements) {
    const name = contributorName(contributorsById, statement.contributorId);
    if (!statement.consented) {
      blockers.push(`${name} is listed in the credit statement without consent`);
      requiredActions.push(action(
        'collect_credit_consent',
        statement.contributorId,
        'publication credit requires explicit contributor consent'
      ));
    }
    if (list(statement.creditRoles).length === 0) {
      blockers.push(`${name} has no CRediT roles assigned`);
      requiredActions.push(action(
        'assign_credit_roles',
        statement.contributorId,
        'credited contributors need at least one CRediT taxonomy role'
      ));
    }
  }

  for (const contributorId of artifactContributorIds) {
    if (!statementsById.has(contributorId)) {
      const name = contributorName(contributorsById, contributorId);
      blockers.push(`${name} contributed to project artifacts but is missing from credit statement`);
      requiredActions.push(action(
        'review_omitted_artifact_contributor',
        contributorId,
        'artifact contributions must be credited or explicitly excluded with review evidence'
      ));
    }
  }

  const hasConsentBlocker = blockers.some((item) => /without consent/i.test(item));
  const consentedCount = statements.filter((statement) => statement.consented).length;
  const decision = hasConsentBlocker
    ? 'blocked'
    : blockers.length > 0
      ? 'needs-remediation'
      : 'approved';

  return {
    projectId: input.projectId,
    action: input.action,
    generatedAt: input.generatedAt,
    decision,
    blockers,
    requiredActions,
    coverage: {
      artifactContributorCount: artifactContributorIds.length,
      creditedContributorCount: statements.length,
      consentCoverage: statements.length === 0 ? 1 : consentedCount / statements.length,
    },
  };
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function buildCreditReport(result) {
  return [
    '# Project Contribution Credit Gate Report',
    '',
    `Project: ${result.projectId}`,
    `Action: ${result.action}`,
    `Generated: ${result.generatedAt}`,
    `Decision: ${result.decision}`,
    '',
    '## Coverage',
    '',
    `Artifact contributors: ${result.coverage.artifactContributorCount}`,
    `Credited contributors: ${result.coverage.creditedContributorCount}`,
    `Consent coverage: ${percent(result.coverage.consentCoverage)}`,
    '',
    '## Blockers',
    '',
    ...(result.blockers.length ? result.blockers.map((item) => `- ${item}`) : ['- None']),
    '',
    '## Required Actions',
    '',
    ...(result.requiredActions.length
      ? result.requiredActions.map((item) => `- ${item.type}: ${item.target} (${item.reason})`)
      : ['- None']),
    '',
  ].join('\n');
}

module.exports = {
  evaluateContributionCredit,
  buildCreditReport,
};
