# Requirements Map

| Issue #13 requirement | Implementation coverage |
| --- | --- |
| AI Peer Review Aid | Produces manuscript-level diagnostics, reviewer actions, and readiness status for statistical multiplicity risks. |
| Statistical error detection | Detects missing multiple-comparison correction, missing adjusted values, FDR mismatches, and overclaimed p-value results. |
| Customizable review templates | Separates confirmatory and exploratory family logic, endpoint hierarchy checks, and correction-method policy. |
| Immediate diagnostic report | Emits deterministic JSON and Markdown reports plus a review queue for each manuscript and result family. |
| Institutional quality dashboard | Exposes summary counts, manuscript statuses, family statuses, and audit digest for dashboard/API use. |

## Non-Overlap Notes

This PR focuses only on multiple-comparison control. It does not implement a broad research-tools suite, paper summarizer, citation recommender, citation context-fit checker, manuscript similarity detector, ethics/data availability checks, unit consistency, biomethods provenance, reporting-guideline compliance, or certainty/tone calibration.
