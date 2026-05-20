# Acceptance Notes

## Scope

This contribution focuses on the notebook preview slice of Scientific Data and Code Hosting. It does not introduce a web server or database. Instead, it provides a deterministic domain module that can sit behind future upload, moderation, preview, and repository release flows.

## Why this is distinct

Existing SCIBASE issue #14 contributions cover broad hosting foundations, artifact ledgers, generic FAIR gates, package integrity, and preview cache behavior. This module is notebook-specific: it inspects ipynb-like cells and outputs, catches unsafe preview content, builds a cell-level preview manifest, and maps notebook packages to DataCite/schema.org evidence.

## Validation performed

- Clean notebook package is marked ready.
- Risky notebook package with a leaked token, active HTML, oversized output, incomplete metadata, missing artifact checksum, and incomplete environment capture is marked blocked.
- Digest remains deterministic even when the generated timestamp changes.
- Reviewer packet and SVG dashboard generation are covered by tests.
- A short MP4 demo is included under demo-output for the Algora PR requirement.

## Demo

Run:

    node notebook-preview-integrity-gate/demo.js

Then inspect notebook-preview-integrity-gate/demo-output/.
