# Requirement Map

Issue: SCIBASE-AI/SCIBASE.AI#13 - AI-Assisted Research Tools (MVP Level)

| Requirement | Implementation |
| --- | --- |
| AI paper summarizer | `evaluateSummaryOutputs` checks mode-specific summaries, key findings, implications, next steps, and grounding to manuscript evidence. |
| Abstract, executive, layperson modes | `evaluateSummaryMode` applies deterministic constraints for each mode, including layperson jargon checks. |
| Domain-aware output | The sample manuscript carries domain metadata, and the evaluator requires evidence-backed findings rather than generic prose. |
| AI peer review aid | `evaluatePeerReviewAid` checks statistical diagnostics, compliance diagnostics, similarity risk, clarity findings, and template coverage. |
| Statistical and compliance checks | The harness flags p-value interpretation risks, missing confidence intervals, missing ethics statements, and missing data availability statements. |
| AI citation tool | `evaluateCitationRecommendations` maps required claims to citation candidates and verifies evidence IDs, confidence, DOI metadata, and formatting. |
| Multiple reference styles | APA and Nature formatting are validated with style-specific checks. |
| Immediate reviewer value | `evaluateResearchToolRun` returns a readiness decision, action queue, score, and SHA-256 audit digest suitable for PR/demo review. |
