# Repository Access Review Gate

This self-contained slice adds a release-time access review for scientific project repositories.
It checks whether collaborators, reviewer links, restricted datasets, and artifact licenses are safe before a tagged repository export is made public.

The module is intentionally dependency-free and uses synthetic data only.

## What it produces

- `releaseStatus`: `ready` or `hold`.
- `releaseHolds`: deterministic blockers for stale external reviewers, expired data-use approvals, privileged role drift, secret-link exposure, and license/access mismatch.
- `accessMatrix`: per-collaborator keep/revoke/downgrade decisions.
- `reviewerChecklist`: action-ready remediation items for repository owners and data stewards.
- `auditDigest`: SHA-256 digest over the packet for reviewer evidence.

## Run locally

```bash
node repository-access-review-gate/test.js
node repository-access-review-gate/demo.js
```

The demo writes JSON, Markdown, SVG, and MP4 artifacts to `repository-access-review-gate/demo-output/`.
