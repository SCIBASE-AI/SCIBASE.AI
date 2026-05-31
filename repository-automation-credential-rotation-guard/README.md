# Repository Automation Credential Rotation Guard

This module is a focused Project Repository & Version Control slice for SCIBASE issue #10. It reviews synthetic repository automation credentials before scientific release workflows are allowed to publish artifacts.

The guard evaluates GitHub Actions tokens, deploy keys, registry publishers, artifact signing credentials, and bot app grants for rotation freshness, expiry during a release window, owner attestation freshness, dormant access, environment-scoped permissions, privileged scopes, wildcard refs, clean secret-scan evidence, and deterministic rotation evidence.

## Why This Slice Is Distinct

Existing issue #10 submissions cover broad repository ledgers, branch protection, semantic tags, fork provenance, release signatures, Git LFS pointer integrity, retention holds, embargo release, artifact pruning, notebook output diffs, and external reference pinning. This guard focuses only on CI/deploy automation credentials and their release-blocking rotation evidence.

It uses synthetic fixtures only. It does not read real repositories, call GitHub APIs, handle private credentials, or scan live secrets.

## Run

```bash
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts to `reports/`:

- `credential-rotation-packet.json`
- `credential-rotation-report.md`
- `summary.svg`

## Decision Model

- `release-ready`: no high or critical findings.
- `review-before-release`: only medium findings remain.
- `rotate-before-release`: one or more high findings require rotation or scope reduction.
- `hold-release`: at least one critical finding blocks the release.

The packet includes a deterministic `sha256:` audit digest so reviewers can verify that JSON, Markdown, and visual artifacts all describe the same synthetic review.
