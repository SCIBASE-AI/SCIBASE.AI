# Notebook Preview Integrity Gate

Self-contained Scientific Data and Code Hosting module for issue #14. It audits notebook packages before SCIBASE renders public previews, so notebooks, datasets, figures, and metadata can be shown without leaking credentials, breaking FAIR metadata expectations, or publishing unusable preview artifacts.

## What it does

- Parses notebook cells and outputs into a deterministic preview manifest.
- Blocks previews containing likely secrets, private keys, API tokens, or active HTML/script payloads.
- Flags oversized inline outputs that should be stored as checksum-addressed artifacts instead of embedded in notebook JSON.
- Checks execution order coherence, missing visual alt text, environment capture, artifact checksums, MIME types, licenses, and generated preview state.
- Produces DataCite and schema.org draft metadata from the project package.
- Emits a reviewer packet and SVG dashboard that can be attached to moderation, repository release, or publication workflows.

## Local usage

    node notebook-preview-integrity-gate/test.js
    node notebook-preview-integrity-gate/demo.js

The demo writes:

- demo-output/notebook-preview-report.json
- demo-output/reviewer-packet.md
- demo-output/notebook-preview-dashboard.svg
- demo-output/notebook-preview-demo.mp4, generated separately for the Algora short demo video requirement

## Example

    const { auditNotebookPreviewIntegrity } = require("./notebook-preview-integrity-gate");
    const { cleanNotebookPackage } = require("./notebook-preview-integrity-gate/sample-data");

    const report = auditNotebookPreviewIntegrity(cleanNotebookPackage);
    console.log(report.decision, report.score, report.fairScore.overall);

## Integration notes

The module is dependency-free CommonJS so it can be dropped behind a future upload worker, repository release gate, or admin review queue. The returned report is JSON-safe and includes a stable digest for audit logs.
