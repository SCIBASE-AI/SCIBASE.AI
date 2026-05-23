# Collaborative Suggestion Acceptance Provenance Guard

Self-contained guard for SCIBASE issue #12. The module validates accepted suggestions before they mutate publication-ready manuscript sections in a real-time collaborative research editor.

## Scope

- Verifies that target sections still exist.
- Checks base section hashes so stale suggestions cannot silently overwrite newer manuscript text.
- Resolves quote anchors and detects anchor drift.
- Enforces protected-section lock overrides for results, methods, ethics, and limitations sections.
- Requires configured author approvals, including the corresponding author by default.
- Blocks acceptance while unresolved blocking reviewer replies remain.
- Defers acceptance when related notebook outputs are stale.
- Emits deterministic JSON, Markdown, SVG, and MP4 review artifacts.

## Local Validation

```bash
npm run check
npm test
npm run demo
```

Generated artifacts are written to `reports/`.

## Integration Shape

`evaluateSuggestionAcceptanceProvenance()` accepts manuscript packets with sections, authors, comments, notebook outputs, and suggestions. It returns:

- `acceptQueue`
- `deferQueue`
- `escalationQueue`
- per-suggestion provenance digests
- a global SHA-256 audit digest
