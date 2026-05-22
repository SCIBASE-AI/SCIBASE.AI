# Acceptance Notes

## Scope

The contribution adds `manuscript-evidence-binding-guard/`, a self-contained module for issue #12. It focuses on manuscript release integrity for collaborative scientific editing.

## Why This Helps The Bounty Poster

Issue #12 asks for a real-time collaborative research editor that can support scientific manuscripts, notebooks, cross-references, comments, version history, and submission workflows. A collaborative editor can still fail at release time if a claim, figure, table, or equation points to stale notebook output or an outdated dataset. This guard makes that failure mode visible before export.

## Decision Packet

The PR includes:

- deterministic sample manuscript and evidence data,
- evaluator logic for stale and missing evidence bindings,
- tests covering blocked stale evidence and a clean release scenario,
- JSON, Markdown, and SVG reviewer artifacts,
- a short MP4 demo artifact,
- requirement mapping and non-overlap notes.

## Validation

```bash
npm run check
npm test
npm run demo
npm run video
```
