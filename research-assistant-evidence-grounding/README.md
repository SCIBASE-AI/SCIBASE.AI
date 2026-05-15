# Research Assistant Evidence Grounding

Self-contained MVP module for issue #16, **AI-Powered Research Assistant Suite**. It focuses on evidence-grounded assistant behavior: claims-vs-evidence mapping, pre-submission peer review, reproducibility readiness, and research gap prioritization.

## What It Covers

- Auto peer-review reports grounded in manuscript sections, domain templates, and evidence alignment.
- Claims-vs-evidence matrix for citations, datasets, protocols, statistical analyses, and invalid/missing references.
- Reproducibility checker for environment lockfiles, raw data checksums, pipeline steps, reported output consistency, and prior attempt links.
- Research gap finder that ranks unresolved questions, low-replication clusters, negative signals, and user/lab fit.
- Aggregated assistant brief with release status, blockers, top gap, audit hashes, and reviewer-ready signals.

## Run

```bash
npm run check
```

That runs:

```bash
npm test
npm run demo
```

Expected demo shape:

```json
{
  "projectId": "project-ai-biomarker-002",
  "status": "needs_researcher_attention",
  "evidenceCoverage": 0.667,
  "peerReviewRecommendation": "revise_before_release",
  "reproducibilityConfidence": 100,
  "topResearchGap": "gap-spatial-microglia"
}
```

## Requirement Map

| Issue #16 requirement | Implementation evidence |
| --- | --- |
| Auto peer review reports with clarity, methodology, missing citations, and claims-vs-evidence alignment | `generatePeerReviewReport()` applies domain templates and emits severity-tagged findings for clarity, methodology, and weak claims. |
| Adaptive templates per domain | `DOMAIN_TEMPLATES` maps molecular biology, clinical trials, quantum physics, and generic reviewer lenses/risks. |
| Researcher feedback before release/internal review | `buildAssistantBrief()` combines evidence coverage, peer-review recommendation, blockers, and readiness status. |
| Reproducibility checker for code/notebooks, dependencies, raw data, and reported results | `runReproducibilityCheck()` scores environment lockfiles, raw data checksums, pipeline steps, reported outputs, and prior attempts. |
| Reproducibility confidence score and prior attempt links | The reproducibility result includes `confidenceScore`, `status`, `blockers`, and `attemptLinks`. |
| Research gap finder for under-studied intersections, unresolved questions, low replication, negative results, and user fit | `findResearchGaps()` ranks corpus opportunities by unresolved questions, replication count, negative signals, interests, and lab capabilities. |
| Project-aware AI research assistant output | `buildEvidenceMap()` and `buildAssistantBrief()` generate deterministic audit hashes and reviewer-ready assistant summaries. |

## Files

- `src/index.js` - assistant rules and exported functions.
- `src/cli.js` - reviewer demo command.
- `sample/assistant-fixture.json` - manuscript, evidence library, reproducibility, and corpus fixture.
- `test/assistant.test.js` - regression tests for normalization, evidence mapping, peer review, reproducibility, gap ranking, and brief aggregation.
- `docs/demo.svg` - visual walkthrough for PR review.
- `docs/demo.mp4` - short generated video walkthrough for maintainers who prefer an inline demo artifact.

## Notes

This module is dependency-free and credential-free. It is designed as a deterministic foundation for a future LLM provider adapter, sandbox execution runner, citation index, and UI workflow.
