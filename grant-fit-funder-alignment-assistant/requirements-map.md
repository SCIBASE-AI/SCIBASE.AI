# Requirements Map

| Issue #16 requirement | Implementation |
| --- | --- |
| Real-time insights and automation | `createReviewerPacket()` returns deterministic funding readiness scores and action items. |
| Claims vs. evidence alignment | `scoreEvidenceGrounding()` blocks unsupported or missing evidence references. |
| Scope alignment | `scorePriorityCoverage()` maps aims, impact, beneficiaries, and artifacts to funder priorities. |
| Methodological and reproducibility red flags | `scoreOpenArtifactReadiness()` checks open notebooks, protocols, model cards, and dashboards. |
| Reviewer-ready suggestions | `buildActionItems()` emits concrete revision tasks for missing priorities, artifacts, budget, ethics, and evidence gaps. |
| Adaptive templates per domain | The sample packet models clinical NLP with human-subjects and low-resource priorities. |
| Internal team review before release | `demo.js` writes JSON, Markdown, and SVG packets that can be attached to an internal funding review. |

## Acceptance notes

- Dependency-free CommonJS module.
- No credentials, external APIs, or network calls.
- Deterministic sample data and tests.
- Outputs are generated locally under `reports/`.
