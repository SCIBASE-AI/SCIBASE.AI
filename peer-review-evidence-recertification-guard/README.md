# Peer Review Evidence Recertification Guard

This module adds a focused Community & User Reputation slice for SCIBASE issue #15. It checks whether peer reviews and inline comments still apply after reviewed documents, datasets, code, or notebooks change.

The guard freezes stale review reputation deltas, blocks reputation updates when review or inline-comment evidence is stale, holds missing or malformed review, artifact, inline-comment, and project snapshot timestamps for recertification, blocks recertification timestamps that predate the original review submission, freezes public or semi-private review credit when the reviewer identity is missing, holds malformed reputation-delta evidence before profile credit is applied, turns malformed top-level recertification packets, review and inline-comment evidence entries, or non-array evidence collections into explicit recertification holds, marks inline comment anchors stale when artifact evidence changes or the artifact was updated after the comment even if a selector line did not move, holds missing inline-comment anchor metadata or missing artifact anchor maps for recertification, tolerates omitted review, comment, and artifact collections in sparse project snapshots, generates recertification tasks, preserves anonymous and double-blind reviewer safety across hyphenated, underscored, and space-separated review mode labels, screens anonymous labels for direct identifiers before timeline output, and emits a deterministic project timeline audit packet.

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

## Outputs

- `reports/recertification-packet.json`
- `reports/empty-evidence-packet.json`
- `reports/invalid-reputation-delta-packet.json`
- `reports/malformed-evidence-packet.json`
- `reports/malformed-collection-packet.json`
- `reports/backdated-recertification-packet.json`
- `reports/malformed-project-packet.json`
- `reports/invalid-project-timestamp-packet.json`
- `reports/recertification-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not use credentials, private users, live profile systems, payment systems, or external APIs.
