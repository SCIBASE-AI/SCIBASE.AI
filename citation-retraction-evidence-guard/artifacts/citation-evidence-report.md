# Citation Retraction Evidence Guard Report

Summary: blocks=4, reviews=3, passes=1

## packet:oncology-review-ready

- Manuscript: ms:oncology-review-42
- Decision: RELEASE_ASSISTANT_OUTPUT

| Severity | Code | Message | Remediation |
| --- | --- | --- | --- |
| pass | citation_evidence_ready | Citation evidence is current, unretracted, and aligned with assistant output. | No remediation required. |

## packet:neuro-preprint-review

- Manuscript: ms:neuro-preprint-18
- Decision: HOLD_FOR_EDITOR

| Severity | Code | Message | Remediation |
| --- | --- | --- | --- |
| review | citation_superseded | cite:preprint-2020 appears superseded by cite:journal-2022. | Prefer the current published version or explain why the older version remains relevant. |
| review | background_citation_used_as_support | cite:preprint-2020 is only background evidence for claim:biomarker-generalizes. | Attach direct support or lower the assistant confidence. |

## packet:materials-block

- Manuscript: ms:materials-battery-07
- Decision: BLOCK_ASSISTANT_OUTPUT

| Severity | Code | Message | Remediation |
| --- | --- | --- | --- |
| block | citation_retracted | cite:retracted-2017 is marked retracted. | Remove the citation from supporting evidence or rewrite the assistant note as a retraction warning. |
| review | citation_stale_without_replication | cite:retracted-2017 is older than the configured evidence window and has no recent replication marker. | Attach a recent replication, meta-analysis, or recency caveat. |
| block | retracted_citation_supports_claim | claim:electrolyte-stability is supported by retracted citation cite:retracted-2017. | Remove this evidence path and regenerate the assistant output. |
| block | citation_contradicts_claim | cite:contradiction-2025 is marked as contradicting claim:electrolyte-stability. | Rewrite the assistant note to present the contradiction rather than support the claim. |
| block | assistant_recommends_retracted_citation | Assistant recommends retracted citation cite:retracted-2017. | Regenerate the assistant note with retraction-safe evidence. |
