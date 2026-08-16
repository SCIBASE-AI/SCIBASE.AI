# Repository Sandbox Egress Guard

This contribution adds a focused guard for computation-aware repository execution in SCIBASE's Project Repository & Version Control layer. It checks whether a repository reproducibility run can be executed, reviewed, merged, or tagged without leaking secrets, reaching unapproved network destinations, or mutating hosted artifacts outside the declared workspace.

The slice is intentionally narrow. It does not replace broad repository versioning, file diffs, semantic tags, Git LFS integrity, branch protection, component-owner approvals, notebook replay, release signatures, citation badges, or export-bundle manifests. It covers the execution sandbox boundary for reproducibility pipelines.

## What It Checks

- Public release, DOI, or protected-branch merge is frozen when sandbox findings are unresolved.
- Reproducibility runs use pinned container images, locked dependency manifests, and hashed commands.
- Network egress is denied or limited to an explicit allowlist.
- Secret environment variables, host secret mounts, and credential-like runtime inputs are blocked.
- Privileged containers, root execution, host PID/IPC sharing, and writable Docker socket mounts are held.
- Resource caps for CPU, memory, runtime, and artifact size are present.
- Output paths stay inside declared `results/` or `artifacts/` locations.
- Generated reviewer packets explain deterministic `RELEASE`, `REVIEW_MERGE`, or `HOLD_MERGE` decisions.

## Running Locally

```bash
npm test
npm run demo
npm run check
npm run video
```

The demo uses only synthetic repository execution plans in `data/sample_sandbox_run_plans.json`.

Generated files:

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.mp4`

The MP4 is generated from an FFmpeg color source and drawtext slate. It is not a screen recording and contains no desktop capture or private information.

## Why This Matters

SCIBASE repository releases are credible only when reproducibility pipelines are repeatable and contained. A notebook or analysis script that can read host secrets, call arbitrary services, or write outside the repository workspace can undermine trust even when the version history looks clean.

This guard gives reviewers a deterministic packet to hold risky execution plans, request sandbox hardening, and keep protected-branch merges or tagged DOI releases frozen until the computation boundary is safe.
