# Collaborative Embargo Release Guard

This module adds a focused release-readiness slice for the real-time collaborative research editor in issue #12. It checks whether a collaborative manuscript package is safe to send to a journal, reviewer room, or preprint target when embargo windows, blinded-review rules, restricted artifacts, live comments, and version approvals are all changing in parallel.

The slice is intentionally narrow. It is not a broad editor, notebook workbench, offline conflict resolver, authorship module, presence privacy guard, evidence-binding guard, accessibility checker, or reference formatter. It focuses on the final export moment where a live collaborative room can accidentally leak embargoed datasets, author identity, private comments, or stale section versions.

## What It Checks

- Active embargo windows for datasets and supplements included in the export.
- Double-blind review identity leaks in metadata and section text.
- Restricted artifacts that need redacted digests instead of full release.
- Private or blocking collaboration threads exported by mistake.
- Exported section versions that drift from approved editor versions.
- Release-clock not-before and UTC scheduling problems.
- Live presence snapshot inclusion in external release packets.

## Local Validation

```bash
npm test
npm run check
npm run demo
```

The demo uses synthetic local data only. It writes JSON packets, a Markdown reviewer report, an SVG summary, and a short MP4 walkthrough under `reports/`.
