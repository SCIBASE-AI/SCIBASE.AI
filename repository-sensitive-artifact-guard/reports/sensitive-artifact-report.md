# Repository Sensitive Artifact Commit Guard Report

As of: 2026-05-22
Repository digest: `e1296212638d85509a535fc84efed4e2d03a9ec40e22e217970b4dd876304373`

## Summary

- Commit bundles reviewed: 4
- Findings: 7
- Held commits: syn-commit-a1
- Actions: reject_bundle_and_require_history_rewrite=1, require_repository_hygiene_fix=2, allow_merge_tag_export=1

## Bundle Decisions

| Commit | Branch | Surface | Action | Severity | Findings | Held paths |
| --- | --- | --- | --- | --- | ---: | --- |
| syn-commit-a1 | release/preprint-v2 | doi_snapshot | reject_bundle_and_require_history_rewrite | critical | 5 | notebooks/immune-response-analysis.ipynb<br>data/raw-participant-table.csv |
| syn-commit-b2 | experiment/model-card | merge_request | require_repository_hygiene_fix | medium | 1 | none |
| syn-commit-c3 | protocol/steward-review | tag | require_repository_hygiene_fix | medium | 1 | none |
| syn-commit-d4 | main | export_bundle | allow_merge_tag_export | low | 0 | none |

## Guardrails

- Uses synthetic commit, file, signal, and export metadata only.
- Does not scan real repositories, real secrets, patient data, private projects, or external services.
- Blocks release surfaces when synthetic secret, restricted-data, or patient-identifier indicators appear.
- Emits deterministic rewrite, LFS routing, remediation, and rollback packets for reviewers.
