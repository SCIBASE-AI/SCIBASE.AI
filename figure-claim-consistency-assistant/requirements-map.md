# Requirements Map

Source: SCIBASE.AI issue #16, AI-Powered Research Assistant Suite.

| Requirement | Implementation |
| --- | --- |
| Auto peer review reports | `runAssistant()` emits reviewer-ready findings, severity labels, and correction tasks for figure/table evidence problems. |
| Claims vs. evidence alignment | `evaluateFigure()` and `evaluateTable()` compare claim text metadata with figure panels and table rows. |
| Statistical or methodological red flags | The assistant flags sample-size drift, direction mismatches, missing multiplicity adjustment, and threshold violations. |
| Clarity and coherence checks | Caption caveats, axis units, and table units are reconciled against manuscript claims. |
| Reproducibility checker | Required public artifact types are checked before a claim can be marked ready. |
| Dependency/version integrity equivalent | Audit packets include deterministic SHA-256 digests of the review payload. |
| Research gap finder | `buildResearchGapSignals()` converts unsupported visual claims into targeted follow-up study opportunities. |
| Adaptive templates per domain | Synthetic input includes manuscript domain metadata and claim-specific evidence requirements. |
| Reviewer-facing output | Demo emits JSON, Markdown, SVG, and MP4 artifacts under `reports/`. |
| Local verification | `test.js` covers release decision, claim scoring, issue detection, Markdown output, SVG output, and threshold helper behavior. |
