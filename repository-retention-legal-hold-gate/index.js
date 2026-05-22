const destructiveActions = new Set([
  'delete-export-bundle',
  'delete-component',
  'purge-version',
  'rewrite-history',
]);

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function actionRequiresArchive(action) {
  return ['publish-version', 'export-bundle', 'mint-doi'].includes(action);
}

function isPathInScope(path, scope) {
  return normalizeList(scope).some((prefix) => path === prefix || path.startsWith(prefix));
}

function retentionAction(type, target, reason) {
  return {type, target, reason};
}

function evaluateRepositoryRetention(input) {
  const components = normalizeList(input.components);
  const legalHolds = normalizeList(input.legalHolds);
  const exportBundles = normalizeList(input.exportBundles);
  const blockers = [];
  const requiredActions = [];

  const activeHolds = legalHolds.filter((hold) => hold.active);
  if (destructiveActions.has(input.requestedAction)) {
    const affectedHold = activeHolds.find((hold) =>
      components.some((component) => isPathInScope(component.path, hold.scope))
    );
    if (affectedHold) {
      blockers.push(`Active legal hold ${affectedHold.id} prevents ${input.requestedAction}`);
      requiredActions.push(retentionAction(
        'preserve_legal_hold_scope',
        affectedHold.id,
        affectedHold.reason || 'active legal hold'
      ));
    }
  }

  if (actionRequiresArchive(input.requestedAction)) {
    for (const component of components) {
      if (!component.archived) {
        blockers.push(`${component.path} lacks archive evidence`);
        requiredActions.push(retentionAction(
          'archive_component',
          component.path,
          'version release requires durable archive evidence'
        ));
      }
      if (!component.hash) {
        blockers.push(`${component.path} lacks content hash`);
        requiredActions.push(retentionAction(
          'record_component_hash',
          component.path,
          'hash-based integrity is required for reproducibility'
        ));
      }
    }

    const targetBundles = exportBundles.filter((bundle) => bundle.version === input.taggedVersion);
    if (targetBundles.length === 0) {
      blockers.push(`No export bundle exists for ${input.taggedVersion}`);
      requiredActions.push(retentionAction(
        'create_export_bundle',
        input.taggedVersion,
        'tagged version needs a durable export package'
      ));
    }
    for (const bundle of targetBundles) {
      if (!bundle.manifestHash) {
        blockers.push(`${bundle.id} lacks a manifest hash`);
        requiredActions.push(retentionAction(
          'record_bundle_manifest_hash',
          bundle.id,
          'export bundles need reproducible manifest integrity'
        ));
      }
    }
  }

  const archivedCount = components.filter((component) => component.archived).length;
  const decision = blockers.some((blocker) => /legal hold/i.test(blocker))
    ? 'blocked'
    : blockers.length > 0
      ? 'needs-remediation'
      : 'approved';

  return {
    repositoryId: input.repositoryId,
    requestedAction: input.requestedAction,
    taggedVersion: input.taggedVersion,
    generatedAt: input.generatedAt,
    decision,
    blockers,
    requiredActions,
    activeLegalHoldCount: activeHolds.length,
    coverage: {
      componentCount: components.length,
      archivedCount,
      archiveCoverage: components.length === 0 ? 1 : archivedCount / components.length,
      exportBundleCount: exportBundles.length,
    },
  };
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function buildRetentionReport(result) {
  const lines = [
    `# Repository Retention Legal Hold Gate Report`,
    ``,
    `Repository: ${result.repositoryId}`,
    `Version: ${result.taggedVersion}`,
    `Action: ${result.requestedAction}`,
    `Generated: ${result.generatedAt}`,
    `Decision: ${result.decision}`,
    ``,
    `## Coverage`,
    ``,
    `Component count: ${result.coverage.componentCount}`,
    `Archive coverage: ${percent(result.coverage.archiveCoverage)}`,
    `Export bundles: ${result.coverage.exportBundleCount}`,
    `Active legal holds: ${result.activeLegalHoldCount}`,
    ``,
    `## Blockers`,
    ``,
    ...(result.blockers.length ? result.blockers.map((item) => `- ${item}`) : ['- None']),
    ``,
    `## Required Actions`,
    ``,
    ...(result.requiredActions.length
      ? result.requiredActions.map((action) => `- ${action.type}: ${action.target} (${action.reason})`)
      : ['- None']),
    ``,
  ];
  return lines.join('\n');
}

module.exports = {
  evaluateRepositoryRetention,
  buildRetentionReport,
};
