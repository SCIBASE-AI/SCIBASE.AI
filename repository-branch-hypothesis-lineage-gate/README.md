# Repository Branch Hypothesis Lineage Gate

This module adds a deterministic release-readiness gate for experiment branches in a scientific project repository. It maps branch changes back to declared hypotheses, protocol snapshots, repository components, reproducibility evidence, fork attribution, and citation/version impact before a branch is merged or tagged.

It is intentionally dependency-free and uses synthetic sample data only.

## Why it helps

Project Repository & Version Control requires branch workflows that preserve scientific provenance. A branch can change code, notebooks, datasets, protocols, and result artifacts, but reviewers still need to answer a simple question before merge:

> Does this branch prove which hypothesis it tests, which protocol snapshot it followed, which artifacts changed, and whether the generated results are reproducible?

The gate produces reviewer packets with:

- hypothesis-to-branch coverage
- protocol snapshot checks
- component hash and Git LFS routing checks
- result-to-input lineage checks
- reproducibility evidence checks
- fork attribution and citation notes
- semantic version impact recommendations

## Files

- `index.js` - gate implementation
- `sample-data.js` - synthetic repository examples
- `test.js` - local assertions for ready and blocked branches
- `demo.js` - generates reviewer packets in `reports/`

## Usage

```bash
node repository-branch-hypothesis-lineage-gate/test.js
node repository-branch-hypothesis-lineage-gate/demo.js
```

The demo writes JSON, Markdown, and SVG artifacts under:

```text
repository-branch-hypothesis-lineage-gate/reports/
```

The included `reports/demo.mp4` is a short static walkthrough artifact for bounty review.

## Requirement Coverage

- Repository structure: validates `manuscript`, `data`, `code`, `notebook`, `results`, `protocol`, and `metadata` components.
- File and metadata versioning: checks component hashes, semantic version impact, and rollback references.
- Collaboration and forking: verifies branch ownership, fork attribution, and merge-readiness evidence.
- Computation-aware reproducibility: links result artifacts to the data/code/notebook inputs that produced them.
- Repository identifiers and citation: emits citation notes for DOI, author, and metadata-impacting changes.
- Programmatic access and export: produces machine-readable JSON reviewer packets.
