# Repository Merge Queue Governance

Self-contained Project Repository & Version Control slice for issue #10. It focuses on a review and merge-control gap that is different from broad repository ledgers, dataset diffs, release embargo controls, notebook replay ledgers, schema migration checks, citation impact gates, provenance chains, and API/export contract verifiers: deciding whether a scientific branch is ready to enter the merge queue.

The guard evaluates merge requests before a research repository branch can be merged, tagged, exported, or cited.

## What It Does

- Checks branch references, author attribution, base branch freshness, protected scientific component coverage, reviewer-role approvals, unresolved discussion threads, fork attribution, reproducibility evidence, large-file/LFS routing, generated-output digests, content hashes, semantic version impact, and citation impact notes.
- Produces ready, held, or blocked decisions for each merge request.
- Emits deterministic SHA-256 audit digests for both the per-merge-request decision and the whole queue report.
- Returns reviewer-ready remediation actions for merge queue governance.

## Files

- `index.js` - dependency-free merge queue evaluator.
- `test.js` - Node assertion coverage for ready, held, blocked, approval, reproducibility, LFS, hash, generated-output, and deterministic digest paths.
- `demo.js` - terminal demo over synthetic scientific merge requests.
- `requirements-map.md` - explicit mapping to issue #10.
- `acceptance-notes.md` - verification notes and limitations.
- `demo.svg` / `demo.mp4` - short visual demo artifacts for bounty review.

## Run

```bash
node repository-merge-queue-governance/test.js
node repository-merge-queue-governance/demo.js
```

## Example Output

```text
Repository Merge Queue Governance Demo
======================================
merge requests: 3
ready: 1, held: 1, blocked: 1
files reviewed: 6
large files: 2
```

## Design Notes

The module is synthetic-data-only and has no network, GitHub, Git, Algora, DOI, Crossref, DataCite, or credential integration. It is intended as the deterministic policy layer that can sit in front of real merge queues, project repository releases, and export/citation workflows.
