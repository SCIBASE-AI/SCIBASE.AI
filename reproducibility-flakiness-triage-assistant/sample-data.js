'use strict';

const { expectedRunRoot, digest } = require('./index');

function run(id, overrides = {}) {
  return {
    id,
    commit: overrides.commit || '4d61ca1',
    environmentHash: overrides.environmentHash || 'env-locked-2026',
    datasetHash: overrides.datasetHash || 'dataset-v1',
    exitCode: overrides.exitCode === undefined ? 0 : overrides.exitCode,
    startedAt: overrides.startedAt || '2026-05-19T10:00:00.000Z',
    outputs: overrides.outputs || {
      'metrics.json': '8a7c-metrics-stable',
      'figure-2.png': 'f2-stable',
    },
  };
}

function withRoot(project) {
  return {
    ...project,
    runRoot: expectedRunRoot(project),
  };
}

const stableProject = withRoot({
  projectId: 'proj-stable-microscopy',
  title: 'Open microscopy segmentation benchmark',
  runs: [
    run('stable-run-1'),
    run('stable-run-2', { startedAt: '2026-05-19T12:00:00.000Z' }),
  ],
  staticSignals: {
    unseededRandomCalls: 0,
    wallClockReads: 0,
    networkCalls: 0,
    unpinnedDependencies: 0,
  },
  priorAttempts: [
    { id: 'attempt-osf-1', result: 'passed' },
  ],
});

const controlledRandomProject = withRoot({
  projectId: 'proj-seed-warning',
  title: 'Cell morphology bootstrap interval',
  runs: [
    run('seed-run-1', { outputs: { 'metrics.json': 'seeded-same', 'figure-2.png': 'same-plot' } }),
    run('seed-run-2', { outputs: { 'metrics.json': 'seeded-same', 'figure-2.png': 'same-plot' }, startedAt: '2026-05-19T12:00:00.000Z' }),
  ],
  staticSignals: {
    unseededRandomCalls: 1,
    wallClockReads: 1,
    networkCalls: 0,
    unpinnedDependencies: 0,
  },
  priorAttempts: [],
});

const flakyOutputProject = withRoot({
  projectId: 'proj-output-drift',
  title: 'Notebook with stochastic optimizer',
  runs: [
    run('drift-run-1', { outputs: { 'metrics.json': 'loss-0.41', 'figure-2.png': 'plot-a' } }),
    run('drift-run-2', { outputs: { 'metrics.json': 'loss-0.53', 'figure-2.png': 'plot-b' }, startedAt: '2026-05-19T12:00:00.000Z' }),
  ],
  staticSignals: {
    unseededRandomCalls: 3,
    wallClockReads: 0,
    networkCalls: 0,
    unpinnedDependencies: 0,
  },
  priorAttempts: [],
});

const environmentDriftProject = withRoot({
  projectId: 'proj-env-drift',
  title: 'Single-cell batch correction pipeline',
  runs: [
    run('env-run-1', { environmentHash: 'env-r-4.3-lock', outputs: { 'metrics.json': 'env-a', 'figure-2.png': 'same' } }),
    run('env-run-2', { environmentHash: 'env-r-latest', outputs: { 'metrics.json': 'env-b', 'figure-2.png': 'same' }, startedAt: '2026-05-19T12:00:00.000Z' }),
  ],
  staticSignals: {
    unseededRandomCalls: 0,
    wallClockReads: 0,
    networkCalls: 0,
    unpinnedDependencies: 2,
  },
  priorAttempts: [],
});

const networkProject = withRoot({
  projectId: 'proj-network-input',
  title: 'Literature enrichment notebook',
  runs: [
    run('network-run-1', { outputs: { 'metrics.json': 'lit-a', 'figure-2.png': 'same' } }),
    run('network-run-2', { outputs: { 'metrics.json': 'lit-a', 'figure-2.png': 'same' }, startedAt: '2026-05-19T12:00:00.000Z' }),
  ],
  staticSignals: {
    unseededRandomCalls: 0,
    wallClockReads: 0,
    networkCalls: 4,
    unpinnedDependencies: 0,
  },
  priorAttempts: [],
});

const priorFailureProject = withRoot({
  projectId: 'proj-prior-failures',
  title: 'Clinical trial subgroup analysis',
  runs: [
    run('clinical-run-1', { outputs: { 'metrics.json': 'clinical-a', 'figure-2.png': 'same' } }),
    run('clinical-run-2', { outputs: { 'metrics.json': 'clinical-a', 'figure-2.png': 'same' }, startedAt: '2026-05-19T12:00:00.000Z' }),
  ],
  staticSignals: {
    unseededRandomCalls: 0,
    wallClockReads: 0,
    networkCalls: 0,
    unpinnedDependencies: 0,
  },
  priorAttempts: [
    { id: 'journal-recheck-1', result: 'failed' },
    { id: 'funder-rerun-2', result: 'failed' },
  ],
});

const register = {
  checkedAt: '2026-05-20T00:00:00.000Z',
  projects: [
    stableProject,
    controlledRandomProject,
    flakyOutputProject,
    environmentDriftProject,
    networkProject,
    priorFailureProject,
  ],
};

const cleanRegister = {
  checkedAt: register.checkedAt,
  projects: [stableProject],
};

const tamperedStableProject = {
  ...stableProject,
  runRoot: digest({ tampered: true }),
};

module.exports = {
  register,
  cleanRegister,
  stableProject,
  controlledRandomProject,
  flakyOutputProject,
  environmentDriftProject,
  networkProject,
  priorFailureProject,
  tamperedStableProject,
};
