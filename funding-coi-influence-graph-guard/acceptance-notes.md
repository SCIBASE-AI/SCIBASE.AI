# Acceptance Notes

## Issue #17 Fit

The module adds a scientific knowledge graph trust layer for funding and COI influence. It helps recommendations avoid undisclosed sponsor influence while preserving safe, annotated, and curator-reviewable graph paths.

## Reviewer Value

- Treats funders, sponsors, institutions, authors, datasets, and publications as explicit graph entities.
- Separates safe publication, annotation, recommendation suppression, and hard quarantine outcomes.
- Produces deterministic JSON, Markdown, SVG, MP4, and digest evidence for curator review.

## Local Validation

- `node funding-coi-influence-graph-guard/test.js`
- `node funding-coi-influence-graph-guard/demo.js`
- `node --check funding-coi-influence-graph-guard/index.js`
- `node --check funding-coi-influence-graph-guard/sample-data.js`
- `node --check funding-coi-influence-graph-guard/test.js`
- `node --check funding-coi-influence-graph-guard/demo.js`
- `git diff --check`
