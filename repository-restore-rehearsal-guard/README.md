# Repository Restore Rehearsal Guard

This module adds a focused Project Repository & Version Control slice for SCIBASE issue #10. It validates whether a tagged repository snapshot can be restored before DOI/export publication.

The guard is intentionally narrower than repository ledgers, rollback, legal-hold, embargo, access-review, and release-engine work. It answers one reviewer question: can this exact scientific snapshot be restored with the expected refs, components, large artifacts, environment locks, notebook replay evidence, and export manifest?

## What It Checks

- release candidates declare an immutable snapshot id
- restore drills are recent and passed
- protected refs and semantic tags are included in the snapshot
- required `manuscript`, `data`, `code`, and `metadata` components match expected hashes
- large or restricted artifacts have ready mirrors with matching hashes
- container and dependency locks are available for replay
- notebook replay evidence is fresh
- export manifests point at the restored snapshot

## Usage

```bash
npm run check
npm test
npm run demo
```

`npm run demo` writes deterministic reviewer artifacts into `reports/`, including JSON, Markdown, SVG, and an MP4 demo video when `ffmpeg` is available.

## Safety

All examples are synthetic. The module does not scan private repositories, call external services, open network connections, or include credentials.
