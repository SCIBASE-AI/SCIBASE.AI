# Notebook Result Replay Ledger

This module adds a focused computation-aware reproducibility slice for
SCIBASE project repositories. It models notebook cells, data/code/environment
dependencies, result artifacts, and release gates so a repository version can
answer one practical question before publication:

> Which scientific outputs were generated from the current data, code, and
> runtime evidence, and which outputs must be replayed before this version is
> cited or released?

The implementation is dependency-free and can run as a local validation step,
pre-release check, or future API service.

## What It Covers

- Hashes notebook inputs, code, runtime specs, and result artifacts into a
  stable replay digest.
- Detects stale result outputs after upstream data, code, notebook, or
  environment changes.
- Separates release-blocking failures from advisory replay work.
- Builds rollback-ready replay packets for reviewers and maintainers.
- Emits citation/version impact notes when a tagged repository version should
  not advertise a clean "cite this project" badge.
- Includes tests, sample scientific repository data, a CLI demo, a requirement
  map, and a short demo video.

## Quick Start

```bash
npm run check
npm test
npm run demo
```

Expected demo summary:

```text
Release decision: block-release
Replay findings: 2
Release-blocking artifacts: 2
```

## Repository Layout

```text
notebook-result-replay-ledger/
  data/sample-repository.json
  docs/demo.svg
  docs/demo.mp4
  docs/requirement-map.md
  scripts/demo.js
  src/replay-ledger.js
  test/replay-ledger.test.js
```

## Design Notes

The ledger intentionally stays narrower than a full project repository backend.
It assumes SCIBASE already has repository components such as `data/`, `code/`,
`notebooks/`, `results/`, `protocols/`, and `metadata.json`. This package adds
the reproducibility layer that ties those components together at publication
time:

1. A notebook cell declares its data, code, notebook, and environment inputs.
2. A result artifact stores the dependency hashes used when it was last
   replayed.
3. The ledger recomputes a current replay digest from the repository manifest.
4. Any mismatch, failed run, or late dependency change becomes a finding.
5. Findings are classified into release-blocking or advisory outcomes.

That makes the result suitable for a pull request check, a release checklist, or
a reviewer-facing reproducibility panel.
