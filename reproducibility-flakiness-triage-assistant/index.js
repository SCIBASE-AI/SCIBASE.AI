'use strict';

const crypto = require('crypto');

const DECISION_RANK = {
  reproducible: 0,
  reproducible_with_controls: 1,
  flaky_needs_rerun: 2,
  not_reproducible: 3,
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function worstDecision(current, next) {
  return DECISION_RANK[next] > DECISION_RANK[current] ? next : current;
}

function addFinding(findings, severity, code, message, evidence) {
  findings.push({ severity, code, message, evidence });
}

function byId(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null))];
}

function expectedRunRoot(project) {
  return digest({
    projectId: project.projectId,
    runs: (project.runs || []).map((run) => ({
      id: run.id,
      commit: run.commit,
      environmentHash: run.environmentHash,
      datasetHash: run.datasetHash,
      outputs: run.outputs,
      exitCode: run.exitCode,
      startedAt: run.startedAt,
    })),
  });
}

function outputHashes(run) {
  return Object.values(run.outputs || {});
}

function evaluateRunRoot(project, findings) {
  const expected = expectedRunRoot(project);
  if (project.runRoot !== expected) {
    addFinding(findings, 'blocker', 'run_root_mismatch', 'Run root does not match the submitted reproducibility run packet.', {
      projectId: project.projectId,
      expected,
      actual: project.runRoot || null,
    });
    return 'not_reproducible';
  }
  return 'reproducible';
}

function evaluateRunCompleteness(project, findings) {
  const runs = project.runs || [];
  if (runs.length < 2) {
    addFinding(findings, 'blocker', 'insufficient_repeat_runs', 'Reproducibility triage needs at least two independent runs.', {
      projectId: project.projectId,
      runCount: runs.length,
    });
    return 'flaky_needs_rerun';
  }

  const failed = runs.filter((run) => run.exitCode !== 0);
  if (failed.length > 0) {
    addFinding(findings, 'blocker', 'run_failed', 'One or more reproducibility runs failed before output comparison.', {
      projectId: project.projectId,
      failedRunIds: failed.map((run) => run.id),
    });
    return 'not_reproducible';
  }

  return 'reproducible';
}

function evaluateOutputAgreement(project, findings) {
  const runs = project.runs || [];
  if (runs.length === 0) {
    return 'reproducible';
  }

  let decision = 'reproducible';
  const outputNames = unique(runs.flatMap((run) => Object.keys(run.outputs || {})));
  outputNames.forEach((name) => {
    const hashes = unique(runs.map((run) => (run.outputs || {})[name]));
    if (hashes.length > 1) {
      addFinding(findings, 'blocker', 'output_hash_drift', 'Reported output artifact hash changes across repeated runs.', {
        projectId: project.projectId,
        output: name,
        hashes,
      });
      decision = worstDecision(decision, 'flaky_needs_rerun');
    }
  });

  return decision;
}

function evaluateEnvironmentAndData(project, findings) {
  const runs = project.runs || [];
  let decision = 'reproducible';
  const environmentHashes = unique(runs.map((run) => run.environmentHash));
  const datasetHashes = unique(runs.map((run) => run.datasetHash));

  if (environmentHashes.length > 1) {
    addFinding(findings, 'blocker', 'environment_drift', 'Repeated runs used different environment hashes.', {
      projectId: project.projectId,
      environmentHashes,
    });
    decision = worstDecision(decision, 'not_reproducible');
  }

  if (datasetHashes.length > 1) {
    addFinding(findings, 'blocker', 'dataset_drift', 'Repeated runs used different dataset hashes.', {
      projectId: project.projectId,
      datasetHashes,
    });
    decision = worstDecision(decision, 'not_reproducible');
  }

  return decision;
}

function evaluateFlakinessSignals(project, findings) {
  let decision = 'reproducible';
  const signals = project.staticSignals || {};
  if (signals.unseededRandomCalls > 0) {
    addFinding(findings, 'warning', 'unseeded_randomness', 'Code scan found random calls without a declared seed.', {
      projectId: project.projectId,
      count: signals.unseededRandomCalls,
    });
    decision = worstDecision(decision, 'reproducible_with_controls');
  }
  if (signals.wallClockReads > 0) {
    addFinding(findings, 'warning', 'wall_clock_dependency', 'Run logic reads wall-clock time and may produce time-dependent outputs.', {
      projectId: project.projectId,
      count: signals.wallClockReads,
    });
    decision = worstDecision(decision, 'reproducible_with_controls');
  }
  if (signals.networkCalls > 0) {
    addFinding(findings, 'blocker', 'network_dependency', 'Reproducibility run depends on network calls that are not captured in artifacts.', {
      projectId: project.projectId,
      count: signals.networkCalls,
    });
    decision = worstDecision(decision, 'flaky_needs_rerun');
  }
  if (signals.unpinnedDependencies > 0) {
    addFinding(findings, 'blocker', 'unpinned_dependencies', 'Environment declares unpinned dependencies that can change between runs.', {
      projectId: project.projectId,
      count: signals.unpinnedDependencies,
    });
    decision = worstDecision(decision, 'flaky_needs_rerun');
  }
  return decision;
}

function evaluatePriorAttempts(project, findings) {
  const attempts = project.priorAttempts || [];
  const failedAttempts = attempts.filter((attempt) => attempt.result === 'failed');
  if (failedAttempts.length >= 2) {
    addFinding(findings, 'blocker', 'prior_failed_reproductions', 'Prior independent reproducibility attempts failed repeatedly.', {
      projectId: project.projectId,
      failedAttemptIds: failedAttempts.map((attempt) => attempt.id),
    });
    return 'not_reproducible';
  }
  if (failedAttempts.length === 1) {
    addFinding(findings, 'warning', 'prior_failed_reproduction', 'One prior reproducibility attempt failed and should be reconciled.', {
      projectId: project.projectId,
      failedAttemptIds: failedAttempts.map((attempt) => attempt.id),
    });
    return 'reproducible_with_controls';
  }
  return 'reproducible';
}

function classifyLikelyCause(project, result) {
  const codes = result.blockers.concat(result.warnings).map((finding) => finding.code);
  if (codes.includes('environment_drift') || codes.includes('unpinned_dependencies')) {
    return 'environment_dependency_drift';
  }
  if (codes.includes('dataset_drift')) {
    return 'input_dataset_drift';
  }
  if (codes.includes('network_dependency')) {
    return 'uncaptured_external_dependency';
  }
  if (codes.includes('unseeded_randomness') || codes.includes('output_hash_drift')) {
    return 'nondeterministic_execution';
  }
  if (codes.includes('prior_failed_reproductions')) {
    return 'independent_failure_history';
  }
  return 'stable_reproduction';
}

function buildProjectActions(project, result) {
  const codes = result.blockers.concat(result.warnings).map((finding) => finding.code);
  const actions = [];
  if (codes.includes('run_root_mismatch')) {
    actions.push('Regenerate signed run packet before review.');
  }
  if (codes.includes('environment_drift') || codes.includes('unpinned_dependencies')) {
    actions.push('Lock dependency versions and rerun in a pinned environment.');
  }
  if (codes.includes('dataset_drift')) {
    actions.push('Freeze input dataset hash and attach dataset provenance.');
  }
  if (codes.includes('network_dependency')) {
    actions.push('Vendor or mock external network inputs inside the reproducibility bundle.');
  }
  if (codes.includes('unseeded_randomness') || codes.includes('output_hash_drift')) {
    actions.push('Set deterministic seeds and compare repeated output artifact hashes.');
  }
  if (codes.includes('wall_clock_dependency')) {
    actions.push('Inject a fixed clock or record timestamp-sensitive outputs separately.');
  }
  if (codes.includes('prior_failed_reproductions') || codes.includes('prior_failed_reproduction')) {
    actions.push('Link prior reproduction logs and resolve discrepancies before public release.');
  }
  if (actions.length === 0) {
    actions.push('Publish reproducibility confidence packet.');
  }
  return actions;
}

function evaluateProject(project) {
  const findings = [];
  let decision = evaluateRunRoot(project, findings);
  decision = worstDecision(decision, evaluateRunCompleteness(project, findings));
  decision = worstDecision(decision, evaluateEnvironmentAndData(project, findings));
  decision = worstDecision(decision, evaluateOutputAgreement(project, findings));
  decision = worstDecision(decision, evaluateFlakinessSignals(project, findings));
  decision = worstDecision(decision, evaluatePriorAttempts(project, findings));

  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  const outputHashSets = (project.runs || []).map((run) => ({
    runId: run.id,
    outputDigest: digest(outputHashes(run)),
  }));
  const result = {
    projectId: project.projectId,
    title: project.title,
    decision,
    confidence: decision === 'reproducible' ? 0.96
      : decision === 'reproducible_with_controls' ? 0.78
        : decision === 'flaky_needs_rerun' ? 0.48
          : 0.18,
    runCount: (project.runs || []).length,
    blockers,
    warnings,
    runRoot: project.runRoot,
    outputHashSets,
  };
  result.likelyCause = classifyLikelyCause(project, result);
  result.authorActions = buildProjectActions(project, result);
  result.reviewerPacketDigest = digest({
    projectId: result.projectId,
    decision: result.decision,
    likelyCause: result.likelyCause,
    blockers: result.blockers,
    warnings: result.warnings,
    outputHashSets,
  });
  return result;
}

function buildAssistantTasks(projects) {
  const tasks = [];
  if (projects.some((project) => project.blockers.some((finding) => finding.code === 'environment_drift' || finding.code === 'unpinned_dependencies'))) {
    tasks.push('Prioritize pinned-environment reruns before peer-review release.');
  }
  if (projects.some((project) => project.blockers.some((finding) => finding.code === 'network_dependency'))) {
    tasks.push('Require captured external inputs or network mocks in reproducibility bundles.');
  }
  if (projects.some((project) => project.blockers.some((finding) => finding.code === 'output_hash_drift'))) {
    tasks.push('Open nondeterminism triage for output hash drift and seed sensitivity.');
  }
  if (projects.some((project) => project.blockers.some((finding) => finding.code === 'prior_failed_reproductions'))) {
    tasks.push('Escalate projects with repeated failed independent reproductions to editorial review.');
  }
  if (projects.some((project) => project.warnings.some((finding) => finding.code === 'wall_clock_dependency'))) {
    tasks.push('Add fixed-clock controls to time-sensitive project runs.');
  }
  if (tasks.length === 0) {
    tasks.push('Publish all reproducibility flakiness triage packets.');
  }
  return tasks;
}

function evaluateReproducibilityFlakinessTriage(register) {
  const projects = (register.projects || []).map(evaluateProject);

  return {
    checkedAt: register.checkedAt,
    decision: projects.some((project) => project.decision === 'not_reproducible') ? 'not_reproducible'
      : projects.some((project) => project.decision === 'flaky_needs_rerun') ? 'flaky_needs_rerun'
        : projects.some((project) => project.decision === 'reproducible_with_controls') ? 'reproducible_with_controls'
          : 'reproducible',
    summary: {
      totalProjects: projects.length,
      reproducible: projects.filter((project) => project.decision === 'reproducible').length,
      reproducibleWithControls: projects.filter((project) => project.decision === 'reproducible_with_controls').length,
      flakyNeedsRerun: projects.filter((project) => project.decision === 'flaky_needs_rerun').length,
      notReproducible: projects.filter((project) => project.decision === 'not_reproducible').length,
      averageConfidence: Number((projects.reduce((sum, project) => sum + project.confidence, 0) / Math.max(projects.length, 1)).toFixed(2)),
    },
    projects,
    assistantTasks: buildAssistantTasks(projects),
    auditDigest: digest({
      checkedAt: register.checkedAt,
      projects: projects.map((project) => ({
        projectId: project.projectId,
        decision: project.decision,
        likelyCause: project.likelyCause,
        reviewerPacketDigest: project.reviewerPacketDigest,
      })),
    }),
  };
}

module.exports = {
  evaluateReproducibilityFlakinessTriage,
  expectedRunRoot,
  stableStringify,
  digest,
  byId,
};
