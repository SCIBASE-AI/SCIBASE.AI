# Demo Transcript

1. Load four synthetic institution-facing reputation dossier packets.
2. Evaluate consent, opt-out state, anonymous review redaction, semi-private review authorization, credit evidence, badge freshness, and conflict notes.
3. Emit deterministic export decisions: RELEASE_DOSSIER, REVIEW_BEFORE_EXPORT, or HOLD_EXPORT.
4. Write JSON, Markdown, and SVG artifacts for reviewer replay.

## Demo Output

- Release: 1
- Review: 1
- Hold: 2
- Held dossiers: dossier-opt-out, dossier-blind-leak
- Review dossiers: dossier-stale-review
