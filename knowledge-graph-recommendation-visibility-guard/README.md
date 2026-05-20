# Knowledge Graph Recommendation Visibility Guard

This module covers a privacy and governance slice of SCIBASE issue #17.

It checks scientific knowledge graph recommendations before they appear in graph navigation, entity pages, sidebars, or discovery digests. Recommendations that would expose private, embargoed, restricted, or institution-only research artifacts are suppressed until the viewer has the right institution, project, consent, license, and clearance context.

## What It Does

- Evaluates graph recommendation paths against node visibility and evidence access.
- Supports public, institutional, project, private, embargoed, and restricted artifacts.
- Checks embargo windows, consent IDs, license IDs, and clearance tags.
- Suppresses unsafe paths while keeping safe recommendations visible.
- Produces curator actions and a deterministic audit digest for explainable discovery behavior.

## Run

```bash
node knowledge-graph-recommendation-visibility-guard/test.js
node knowledge-graph-recommendation-visibility-guard/demo.js
```
