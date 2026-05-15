# Requirement Map

This module contributes a focused, reviewable slice of SCIBASE issue #16: AI-Powered Research Assistant Suite.

| Issue #16 requirement | Evidence in this module |
| --- | --- |
| Auto peer review reports | `buildPeerReviewPacket` turns claim/protocol/evidence findings into reviewer-ready action items and prompts. |
| Methodological red flags | `buildClaimReportingSignals` flags unregistered outcomes, post-hoc analyses, threshold-adjacent p-values, missing citations, underpowered claims, and unreported registered outcomes. |
| Claims vs. evidence alignment | `traceClaim` maps each manuscript claim to registered outcomes, planned analyses, evidence artifacts, and reproducibility runs. |
| Reproducibility checker | `traceReproduction` and `scoreReproducibility` verify environment locks, documented seeds, dependency manifests, and recorded analysis runs. |
| Output consistency with reported results | The sample package records deterministic run outputs and analysis IDs, then the report exposes per-claim reproduction status. |
| Research gap finder | `buildResearchGapOpportunities` converts unreported registered outcomes and exploratory/unregistered claims into follow-up opportunity cards. |
| Domain-adaptive template | The reviewer template includes the sample domain and is generated from the submitted study package. |
| No external credentials | The implementation is dependency-free Node.js and uses only local JSON fixtures. |
| Reviewer demo | `npm run demo` prints score, claims traced, selective-reporting status, top action, top gap, and digest; `docs/demo.mp4` is a short visual demo artifact. |
