/claim #10

## Summary

Adds `repository-sandbox-egress-guard/`, a focused Project Repository & Version Control guard for computation-aware reproducibility sandboxes.

This is distinct from existing #10 slices for repository ledgers, branch protection, component-owner approval, semantic tags, Git LFS pointer integrity, notebook output diffs, fork provenance, release signatures, external-reference pinning, citation impact, and export bundle manifests. It focuses only on whether a repository reproducibility pipeline can run, merge, or support a DOI/tagged release without unsafe network egress, secret exposure, privileged execution, host mounts, or workspace-escaping outputs.

## What is included

- Dependency-free Node evaluator.
- Synthetic repository execution plans.
- Deterministic `RELEASE`, `REVIEW_MERGE`, and `HOLD_MERGE` decisions.
- Checks for pinned container images, command hashes, lockfiles, network egress, secrets, privileged/root/host namespace settings, unsafe mounts, resource caps, and output paths.
- Reviewer artifacts:
  - `reports/summary.json`
  - `reports/reviewer-packet.md`
  - `reports/summary.svg`
  - `reports/demo.mp4`

## Validation

Locally verified:

```text
npm.cmd test
npm.cmd run demo
npm.cmd run check
npm.cmd run video
git diff --check
confirmed reports/demo.mp4 was generated as a non-empty local artifact
```

The MP4 demo is an FFmpeg-generated synthetic slate only. It is not a screen recording and contains no desktop capture, credentials, private files, or personal information.

AI-assisted with OpenAI Codex; I reviewed and locally verified the implementation before submitting.
