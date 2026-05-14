# Issue #16 Requirement Map

| Issue #16 capability | Implementation |
| --- | --- |
| Auto peer review reports | `scorePeerReview()` checks abstract clarity, domain terms, overstrong language, limitations, and claim evidence risks. |
| Clarity and coherence checks | Abstract length, missing method terms, and limitations checks produce peer-review actions. |
| Statistical or methodological red flags | `scoreEvidenceAlignment()` links statistics to claims and flags missing or small-sample support. |
| Missing citations or scope misalignment | Claims without citation IDs are flagged with reviewer actions. Domain-specific risky terms catch overbroad scope. |
| Claims vs. evidence alignment | Every claim is traced to evidence, citations, statistics, and issue-level findings. |
| Reproducibility checker | `scoreReproducibility()` validates commands, environment, raw data, checksums, seeds, tests, outputs, and prior attempts. |
| Reproducibility confidence score | The reproducibility result returns a 0-100 score and missing-action list. |
| Links to previous attempts | `previousAttempts` are scored, and the sample includes failed and passing attempt paths. |
| Research gap finder | `rankResearchGaps()` ranks corpus opportunities by interest overlap, lab capability, replication gap, limitations, open questions, and negative results. |
| Personalized opportunities feed | `researcherProfile.interests` and `labCapabilities` influence opportunity ranking. |
| Reviewer guidance | `buildReviewerCalibration()` turns high-risk findings into reviewer training cards with expected findings and coaching notes. |
| Reviewer-ready demo | `scripts/demo.js`, `docs/demo.svg`, and `docs/demo.mp4` show the quality-gate flow. |

This slice is intentionally focused on pre-submission readiness and reviewer calibration, so it can complement broader assistant-suite or reproducibility modules without replacing them.
