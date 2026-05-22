# Requirements Map

Issue #17 asks for a Scientific Knowledge Graph that can turn research objects into structured graph intelligence with trustable navigation and recommendations. This slice focuses on software and runtime compatibility as a graph-safety layer.

| Issue capability | Implementation coverage |
| --- | --- |
| Tools, instruments, and software libraries as extracted entities | `paths[].software`, `paths[].containers`, and `paths[].workflows` model software, runtime, container, and workflow engine nodes attached to graph paths. |
| Linked data and schema-compatible metadata | `entityPagePacket` returns typed recommendation metadata with visible paths, suppressed paths, findings, and curator actions for entity pages. |
| Knowledge navigation across concepts, datasets, notebooks, and protocols | Synthetic scenarios connect concepts, notebooks, datasets, and protocols through recommendation paths. |
| AI research recommendations | `evaluateSoftwareVersionCompatibility` decides whether a recommendation should be shown, hidden, or routed to curator review. |
| Evidence-backed relationship quality | Findings include incompatible version ranges, missing immutable container digests, stale runtime captures, and missing lockfile provenance. |
| Reviewer-ready demo | `demo.js` writes JSON, Markdown, SVG, and H.264 MP4 artifacts in `reports/`. |
| Safe local verification | `test.js` covers blocked, curator-review, and visible path outcomes with no external calls or secrets. |

## Distinctness

This module avoids duplicating existing issue #17 slices by staying narrow: it does not implement a broad extractor, navigator, ontology drift guard, link audit, evidence freshness module, instrument-method compatibility check, reproducibility route planner, recommendation visibility/diversity guard, clinical trial registry guard, ethics provenance guard, or funder lineage guard. It validates whether the software/runtime layer behind a graph path is compatible enough to expose that recommendation.
