# Comment Anchor Drift Gate

This slice supports issue #12, Real-time collaborative research editor &
interface. It reviews inline comments and annotations after document edits so
collaborative reviewers do not leave comments attached to the wrong sentence,
cell output, figure, table, or protocol step.

The module uses synthetic edit packets only. It does not connect to a live
editor, read private documents, or store collaborator identities.

## Checks

- Anchors whose quoted text no longer exists are blocked unless a new exact
  anchor is supplied.
- Anchors that moved outside the expected section are blocked.
- Anchors attached to stale notebook output are blocked when execution evidence
  changed.
- Large anchor movement requires reviewer confirmation.
- Clean anchors produce deterministic reviewer receipts.

## Local Verification

```bash
node real-time-collaborative-editor/comment-anchor-drift-gate/test.js
node real-time-collaborative-editor/comment-anchor-drift-gate/demo.js
git diff --check
```

The demo writes deterministic artifacts under
`real-time-collaborative-editor/comment-anchor-drift-gate/artifacts/`.

## Files

- `gate.js` - anchor drift checks and reviewer receipt generation.
- `data/anchor-packets.json` - synthetic collaborative edit packets.
- `test.js` - Node built-in tests.
- `demo.js` - deterministic JSON, Markdown, and SVG artifact generation.
