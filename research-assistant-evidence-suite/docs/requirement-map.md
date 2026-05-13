# Requirement Map

| Issue #16 requirement | Implementation evidence |
| --- | --- |
| Auto peer review reports | `buildPeerReviewReport` returns score, domain template, prioritized findings, and suggested actions. |
| Clarity and coherence checks | `reviewClarity` detects section coverage, abstract presence, and missing limitations. |
| Statistical or methodological red flags | `reviewMethodology` checks sample size, p-value/effect-size reporting, and methodology section coverage. |
| Missing citations or scope misalignment | `reviewCitationCoverage` and `reviewClaimsAgainstEvidence` flag uncited result sections and overstated claims. |
| Adaptive templates per domain | `DOMAIN_TEMPLATES` applies weighted domains for molecular biology, clinical trials, and computational research. |
| Reproducibility checker | `buildReproducibilityReport` validates datasets, commands, seeds, environments, expected outputs, and prior attempts. |
| Output consistency and dependency integrity | `checkExpectedOutputs`, `checkEnvironment`, and `checkRunCommands` create evidence-linked report items. |
| Confidence score and discrepancy flags | `buildReproducibilityReport` emits `confidenceScore`, `status`, blockers, warnings, and recommended next action. |
| Links to previous reproducibility attempts | `priorAttempts` are preserved in the reproducibility report with actor, date, status, and evidence links. |
| Research gap finder | `findResearchGaps` ranks corpus gaps using novelty, unresolved-question strength, replication scarcity, and profile fit. |
| Opportunity feed based on interests and lab capabilities | `profileFitScore` combines researcher interests, project history, and lab capabilities. |
| Suite-level dashboard | `buildAssistantDashboard` combines peer review, reproducibility, gaps, and readiness status. |
