# Requirement Map

| Issue #16 requirement | Implementation |
| --- | --- |
| Auto peer review reports | `generatePeerReviewPacket()` produces domain-aware findings, weighted scores, and claim-vs-evidence checks. |
| Clarity, method, citation, and evidence checks | Peer review output flags missing method signals, unsupported claims, and low citation count through deterministic findings. |
| Reproducibility checker | `buildReproducibilityRunbook()` verifies required files, deterministic outputs, locked environment state, and execution steps. |
| Confidence score | Reproducibility output includes `confidenceScore` and concrete flags. |
| Links to reproducibility attempts | The runbook exposes a repeatable execution plan for recording attempts in platform workflows. |
| Research gap finder | `findResearchGaps()` scores corpus items by overlap, unresolved questions, low replication, and negative results. |
| Opportunity feed | The top three opportunities are returned in deterministic order with reason codes. |
| Integrated assistant suite | `orchestrateAssistantSuite()` combines peer review, reproducibility, and gap finding into one author action plan. |
| Reviewer-friendly demo/API | `src/demo.js` prints a full report; `src/api.js` serves `/health` and `/demo-report`. |
| Tests | `test/research-assistant.test.js` covers review packets, runbooks, gap ordering, orchestration, and demo shape. |
