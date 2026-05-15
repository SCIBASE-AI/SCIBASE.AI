# Requirement Map

This module contributes a focused protocol-trace slice for issue #16, not a second broad assistant-suite demo.

| Issue #16 requirement | Implementation evidence |
| --- | --- |
| Auto peer review reports | `generatePeerReviewReport()` emits severity-ranked review recommendations for protocol drift, evidence coverage, reproducibility, and manuscript completeness. |
| Clarity/methodological/statistical red flags | The peer-review packet flags unregistered primary claims, evidence blockers, missing manuscript sections, and reproducibility gaps. |
| Claims vs. evidence alignment | `traceClaimsToProtocol()` links manuscript claims to protocol commitments; `buildEvidenceMap()` links claims to evidence artifacts and citations. |
| Reproducibility checker | `evaluateReproducibility()` scores raw data, analysis command, environment lock, expected output hashes, attempts, and test data. |
| Links to previous reproducibility attempts | The sample bundle includes prior attempts; the report surfaces the last attempt and next runbook step. |
| Research gap finder | `findResearchGaps()` ranks research opportunities from user interests, manuscript limitations, activity level, and replication gaps. |
| Research opportunities feed | The demo prints ranked opportunity topics with rationale and open questions. |
| Reviewer-ready output | `analyzeResearchAssistantSuite()` returns claim traces, evidence maps, reproducibility checks, peer-review recommendations, research gaps, readiness score, release decision, and an audit digest. |
| Local verification | `npm run check`, `npm test`, and `npm run demo` run without external services or credentials. |
