'use strict';

const assert = require('assert/strict');
const {
  evaluateReproducibilityFlakinessTriage,
  expectedRunRoot,
  digest,
} = require('./index');
const sample = require('./sample-data');

function evaluateOne(project) {
  return evaluateReproducibilityFlakinessTriage({
    checkedAt: sample.register.checkedAt,
    projects: [project],
  });
}

function testCleanProjectIsReproducible() {
  const result = evaluateReproducibilityFlakinessTriage(sample.cleanRegister);

  assert.equal(result.decision, 'reproducible');
  assert.equal(result.summary.reproducible, 1);
  assert.equal(result.projects[0].likelyCause, 'stable_reproduction');
  assert.equal(result.assistantTasks[0], 'Publish all reproducibility flakiness triage packets.');
}

function testControlsForStableButUnseededSignals() {
  const result = evaluateOne(sample.controlledRandomProject);

  assert.equal(result.decision, 'reproducible_with_controls');
  assert.ok(result.projects[0].warnings.some((finding) => finding.code === 'unseeded_randomness'));
  assert.ok(result.projects[0].warnings.some((finding) => finding.code === 'wall_clock_dependency'));
}

function testOutputDriftRequiresRerun() {
  const result = evaluateOne(sample.flakyOutputProject);

  assert.equal(result.decision, 'flaky_needs_rerun');
  assert.equal(result.projects[0].likelyCause, 'nondeterministic_execution');
  assert.ok(result.projects[0].blockers.some((finding) => finding.code === 'output_hash_drift'));
}

function testEnvironmentDriftIsNotReproducible() {
  const result = evaluateOne(sample.environmentDriftProject);

  assert.equal(result.decision, 'not_reproducible');
  assert.equal(result.projects[0].likelyCause, 'environment_dependency_drift');
  assert.ok(result.projects[0].blockers.some((finding) => finding.code === 'environment_drift'));
  assert.ok(result.projects[0].blockers.some((finding) => finding.code === 'unpinned_dependencies'));
}

function testNetworkDependencyNeedsCapturedInputs() {
  const result = evaluateOne(sample.networkProject);

  assert.equal(result.decision, 'flaky_needs_rerun');
  assert.equal(result.projects[0].likelyCause, 'uncaptured_external_dependency');
  assert.ok(result.projects[0].blockers.some((finding) => finding.code === 'network_dependency'));
}

function testPriorFailuresEscalateToNotReproducible() {
  const result = evaluateOne(sample.priorFailureProject);

  assert.equal(result.decision, 'not_reproducible');
  assert.equal(result.projects[0].likelyCause, 'independent_failure_history');
  assert.ok(result.projects[0].blockers.some((finding) => finding.code === 'prior_failed_reproductions'));
}

function testRunRootMismatchBlocksReview() {
  const result = evaluateOne(sample.tamperedStableProject);

  assert.equal(result.decision, 'not_reproducible');
  assert.ok(result.projects[0].blockers.some((finding) => finding.code === 'run_root_mismatch'));
  assert.notEqual(expectedRunRoot(sample.tamperedStableProject), sample.tamperedStableProject.runRoot);
}

function testCombinedSummaryAndDigestAreDeterministic() {
  const first = evaluateReproducibilityFlakinessTriage(sample.register);
  const second = evaluateReproducibilityFlakinessTriage(sample.register);

  assert.equal(first.decision, 'not_reproducible');
  assert.equal(first.summary.totalProjects, 6);
  assert.equal(first.summary.reproducible, 1);
  assert.equal(first.summary.reproducibleWithControls, 1);
  assert.equal(first.summary.flakyNeedsRerun, 2);
  assert.equal(first.summary.notReproducible, 2);
  assert.equal(first.auditDigest, second.auditDigest);
  assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
}

function run() {
  testCleanProjectIsReproducible();
  testControlsForStableButUnseededSignals();
  testOutputDriftRequiresRerun();
  testEnvironmentDriftIsNotReproducible();
  testNetworkDependencyNeedsCapturedInputs();
  testPriorFailuresEscalateToNotReproducible();
  testRunRootMismatchBlocksReview();
  testCombinedSummaryAndDigestAreDeterministic();
  console.log('reproducibility-flakiness-triage-assistant tests passed');
}

run();
