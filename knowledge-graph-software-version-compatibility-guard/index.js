function list(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return clean(value).toLowerCase();
}

function parseVersion(value) {
  const match = clean(value).match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
  if (!match) {
    return null;
  }
  return [Number(match[1] || 0), Number(match[2] || 0), Number(match[3] || 0)];
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) {
    return 0;
  }
  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1;
    if (a[index] < b[index]) return -1;
  }
  return 0;
}

function satisfiesRange(installed, required) {
  const installedVersion = parseVersion(installed);
  if (!installedVersion || !clean(required)) {
    return true;
  }

  const clauses = clean(required).split(/\s+/).filter(Boolean);
  return clauses.every((clause) => {
    const match = clause.match(/^(>=|<=|>|<|=|~\^?|\^|~)?\s*v?([0-9]+(?:\.[0-9]+){0,2})$/);
    if (!match) {
      return true;
    }
    const operator = match[1] || '=';
    const target = match[2];
    const comparison = compareVersions(installed, target);
    if (operator === '>=') return comparison >= 0;
    if (operator === '<=') return comparison <= 0;
    if (operator === '>') return comparison > 0;
    if (operator === '<') return comparison < 0;
    if (operator === '^') {
      const targetParts = parseVersion(target);
      const installedParts = parseVersion(installed);
      return comparison >= 0 && installedParts[0] === targetParts[0];
    }
    if (operator === '~' || operator === '~^') {
      const targetParts = parseVersion(target);
      const installedParts = parseVersion(installed);
      return comparison >= 0 && installedParts[0] === targetParts[0] && installedParts[1] === targetParts[1];
    }
    return comparison === 0;
  });
}

function isRuntimePackage(name) {
  return ['python', 'node', 'node.js', 'r', 'julia', 'java', 'ruby'].includes(normalize(name));
}

function ageDays(older, newer) {
  const olderTime = Date.parse(older);
  const newerTime = Date.parse(newer);
  if (!Number.isFinite(olderTime) || !Number.isFinite(newerTime)) {
    return 0;
  }
  return Math.floor((newerTime - olderTime) / 86400000);
}

function finding(type, path, subject, message, severity = 'review') {
  return {
    type,
    severity,
    pathId: path.id || 'unknown-path',
    subject,
    message,
  };
}

function action(type, target, reason) {
  return {type, target, reason};
}

function titleForPath(path) {
  const titles = list(path.nodes).map((node) => node.title || node.id).filter(Boolean);
  return titles.length ? titles.join(' -> ') : path.id || 'unknown path';
}

function evaluatePath(path, generatedAt) {
  const findings = [];
  const curatorActions = [];

  for (const item of list(path.software)) {
    if (!satisfiesRange(item.installed, item.required)) {
      const runtime = isRuntimePackage(item.name);
      const type = runtime ? 'runtime-version-incompatible' : 'package-version-incompatible';
      findings.push(
        finding(
          type,
          path,
          item.name,
          `${item.name} ${item.installed || 'unversioned'} does not satisfy ${item.required || 'the required range'} for ${titleForPath(path)}.`,
          'block'
        )
      );
      curatorActions.push(
        action(
          runtime ? 'pin-compatible-runtime' : 'update-package-lock',
          item.name || 'unknown software',
          `Install ${item.name || 'software'} ${item.required || 'at a compatible version'} before this graph path is recommended.`
        )
      );
    }
  }

  for (const container of list(path.containers)) {
    if (!clean(container.digest)) {
      findings.push(
        finding(
          'container-digest-missing',
          path,
          container.image || container.tag || 'container',
          `Container ${container.image || 'image'}:${container.tag || 'tag'} is not pinned by digest.`,
          'block'
        )
      );
      curatorActions.push(
        action(
          'pin-container-digest',
          container.image || 'container image',
          'Record an immutable sha256 digest before exposing this path in discovery recommendations.'
        )
      );
    }
  }

  for (const workflow of list(path.workflows)) {
    if (!satisfiesRange(workflow.installed, workflow.required)) {
      findings.push(
        finding(
          'workflow-engine-incompatible',
          path,
          workflow.engine || 'workflow engine',
          `${workflow.engine || 'Workflow engine'} ${workflow.installed || 'unversioned'} does not satisfy ${workflow.required || 'the required range'}.`,
          'block'
        )
      );
      curatorActions.push(
        action(
          'upgrade-workflow-engine',
          workflow.engine || 'workflow engine',
          `Pin ${workflow.engine || 'workflow engine'} ${workflow.required || 'at a compatible version'} for rerunnable graph provenance.`
        )
      );
    }
  }

  const lockfileEvidence = list(path.evidence).find((item) => normalize(item.type) === 'lockfile');
  if (lockfileEvidence && lockfileEvidence.present === false) {
    findings.push(
      finding(
        'missing-lockfile-provenance',
        path,
        lockfileEvidence.id || 'lockfile',
        'Software versions are compatible but no lockfile evidence is present for curator audit.'
      )
    );
    curatorActions.push(
      action(
        'attach-lockfile',
        lockfileEvidence.id || path.id || 'path',
        'Attach a package lockfile before this recommendation is treated as fully reproducible.'
      )
    );
  }

  const runtimeCapture = list(path.evidence).find((item) => normalize(item.type) === 'runtime-capture');
  if (runtimeCapture && ageDays(runtimeCapture.capturedAt, generatedAt) > 180) {
    findings.push(
      finding(
        'stale-runtime-capture',
        path,
        runtimeCapture.id || 'runtime capture',
        `Runtime capture is ${ageDays(runtimeCapture.capturedAt, generatedAt)} days old and needs refresh before confidence can be upgraded.`
      )
    );
    curatorActions.push(
      action(
        'refresh-runtime-capture',
        runtimeCapture.id || path.id || 'runtime capture',
        'Run a fresh environment capture so graph recommendations reflect current software compatibility.'
      )
    );
  }

  const hasBlocker = findings.some((item) => item.severity === 'block');
  return {
    ...path,
    title: titleForPath(path),
    findings,
    curatorActions,
    compatibilityScore: Math.max(0, 100 - findings.filter((item) => item.severity === 'block').length * 25 - findings.filter((item) => item.severity !== 'block').length * 10),
    status: hasBlocker ? 'suppressed' : findings.length ? 'needs-review' : 'visible',
  };
}

function summarizePaths(paths) {
  const suppressedPathCount = paths.filter((path) => path.status === 'suppressed').length;
  const reviewPathCount = paths.filter((path) => path.status === 'needs-review').length;
  const visiblePathCount = paths.filter((path) => path.status !== 'suppressed').length;
  return {
    totalPathCount: paths.length,
    suppressedPathCount,
    reviewPathCount,
    visiblePathCount,
    findingCount: paths.reduce((sum, path) => sum + path.findings.length, 0),
    actionCount: paths.reduce((sum, path) => sum + path.curatorActions.length, 0),
  };
}

function evaluateSoftwareVersionCompatibility(input = {}) {
  const generatedAt = input.generatedAt || new Date(0).toISOString();
  const evaluatedPaths = list(input.paths).map((path) => evaluatePath(path, generatedAt));
  const findings = evaluatedPaths.flatMap((path) => path.findings);
  const curatorActions = evaluatedPaths.flatMap((path) => path.curatorActions);
  const suppressedPaths = evaluatedPaths
    .filter((path) => path.status === 'suppressed')
    .map((path) => ({
      id: path.id,
      from: path.from,
      to: path.to,
      reason: path.findings
        .filter((item) => item.severity === 'block')
        .map((item) => item.message)
        .join(' '),
      findingTypes: path.findings.map((item) => item.type),
    }));
  const visiblePaths = evaluatedPaths
    .filter((path) => path.status !== 'suppressed')
    .map((path) => ({
      id: path.id,
      from: path.from,
      to: path.to,
      title: path.title,
      status: path.status,
      compatibilityScore: path.compatibilityScore,
      findingTypes: path.findings.map((item) => item.type),
      nodes: path.nodes,
    }));
  const summary = summarizePaths(evaluatedPaths);
  const decision = summary.suppressedPathCount > 0
    ? 'suppress-recommendation'
    : summary.reviewPathCount > 0
      ? 'curator-review'
      : 'show-recommendation';

  return {
    generatedAt,
    recommendationId: input.recommendationId || 'unknown-recommendation',
    decision,
    summary,
    findings,
    curatorActions,
    suppressedPaths,
    visiblePaths,
    entityPagePacket: {
      recommendationId: input.recommendationId || 'unknown-recommendation',
      decision,
      generatedAt,
      visiblePaths,
      suppressedPaths,
      curatorActions,
    },
  };
}

function buildSoftwareCompatibilityReviewPacket(result) {
  const lines = [
    `# Software Compatibility Review: ${result.recommendationId}`,
    '',
    `Decision: ${result.decision}`,
    `Generated: ${result.generatedAt}`,
    '',
    '## Visible Paths',
  ];

  if (result.visiblePaths.length === 0) {
    lines.push('- None');
  } else {
    for (const path of result.visiblePaths) {
      const titles = list(path.nodes).map((node) => node.title || node.id).join(' -> ');
      lines.push(`- ${path.id}: ${titles} (score ${path.compatibilityScore})`);
    }
  }

  lines.push('', '## Suppressed Paths');
  if (result.suppressedPaths.length === 0) {
    lines.push('- None');
  } else {
    for (const path of result.suppressedPaths) {
      lines.push(`- ${path.id}: ${path.reason}`);
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
  evaluateSoftwareVersionCompatibility,
  buildSoftwareCompatibilityReviewPacket,
  satisfiesRange,
};
