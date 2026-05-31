# Repository Artifact Prune Guard

This is a self-contained Project Repository & Version Control slice for issue #10.

The guard checks whether repository artifacts can be pruned before a tagged scientific repository release or export bundle is published. It protects citation evidence, DOI version manifests, export bundle manifests, and reproducibility run packets from accidental deletion.

## Scope

- Synthetic data only.
- No network calls, credentials, DOI provider, storage provider, Git provider, or SCIBASE production service integration.
- Focused on artifact garbage-collection readiness, not broad repository ledgers, external reference pinning, retention legal holds, embargo release checks, component-owner approvals, branch protection, or release signatures.

## Validation

```sh
node repository-artifact-prune-guard/test.js
node repository-artifact-prune-guard/demo.js
```

The demo writes deterministic reviewer artifacts under `repository-artifact-prune-guard/reports/`.

Reviewer artifacts:

- `reports/artifact-prune-packet.json`
- `reports/artifact-prune-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`
