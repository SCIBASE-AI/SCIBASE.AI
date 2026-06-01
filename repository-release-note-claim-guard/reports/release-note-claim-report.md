# Release Note Claim Evidence Review: preprint-v2.2.0

Decision: **hold_repository_release**
Audit digest: `sha256:8431cbaec2db5bd8`

## Summary

| Metric | Value |
| --- | ---: |
| Release notes reviewed | 3 |
| Changed artifacts reviewed | 3 |
| Evidence items reviewed | 3 |
| Findings | 18 |
| High or critical findings | 12 |

## Findings

| Severity | Code | Message | Action |
| --- | --- | --- | --- |
| critical | `NO_BREAKING_CHANGE_CONFLICT` | Release note rn-101 says there are no breaking changes, but 1 changed artifact(s) are marked breaking. | `remove_no_breaking_claim_or_document_breaking_change` |
| high | `ALL_RESULTS_OVERCLAIM` | Release note rn-102 uses high-confidence wording without passed reproduction evidence. | `downgrade_claim_or_add_evidence` |
| high | `BREAKING_CHANGE_NOT_DISCLOSED` | Breaking artifact code/export/public-api.js has no explicit breaking-change release note. | `document_breaking_change_in_release_notes` |
| high | `CLAIM_EVIDENCE_NOT_PASSED` | Evidence ev-old-repro for release note rn-102 has status failed. | `replace_or_rerun_failed_evidence` |
| high | `CLAIM_KIND_EVIDENCE_MISSING` | Release note rn-101 is a api claim but lacks passed test evidence. | `attach_required_claim_evidence` |
| high | `CLAIM_KIND_EVIDENCE_MISSING` | Release note rn-101 is a api claim but lacks passed export evidence. | `attach_required_claim_evidence` |
| high | `CLAIM_KIND_EVIDENCE_MISSING` | Release note rn-102 is a reproducibility claim but lacks passed reproduction evidence. | `attach_required_claim_evidence` |
| high | `CLAIM_KIND_EVIDENCE_MISSING` | Release note rn-103 is a dataset claim but lacks passed checksum evidence. | `attach_required_claim_evidence` |
| high | `CLAIMED_COMPONENT_WITHOUT_CHANGE` | Release note rn-103 names data/public/cohort-clean.csv, but the release packet has no matching changed artifact. | `remove_claim_or_attach_changed_artifact` |
| high | `EXPORT_DIGEST_MISMATCH` | Export manifest digest for data/restricted/cohort-clean.csv does not match the changed artifact digest. | `update_export_manifest_digest` |
| high | `REPRODUCIBILITY_OVERCLAIM` | Release note rn-102 uses high-confidence wording without passed reproduction evidence. | `downgrade_claim_or_add_evidence` |
| high | `VALIDATION_OVERCLAIM` | Release note rn-102 uses high-confidence wording without passed test evidence. | `downgrade_claim_or_add_evidence` |
| medium | `CHANGE_DIGEST_NOT_UPDATED` | Changed artifact results/figures/figure-5.svg does not carry a new post-release digest. | `record_post_release_digest` |
| medium | `CHANGED_ARTIFACT_UNMENTIONED` | Changed artifact data/restricted/cohort-clean.csv is not represented in any public release note. | `add_release_note_or_mark_internal_only` |
| medium | `CLAIM_EVIDENCE_STALE` | Evidence ev-old-repro for release note rn-102 is 93 days old. | `refresh_release_evidence` |
| medium | `CLAIM_PATH_NOT_COVERED_BY_EVIDENCE` | Release note rn-102 cites results/figures/figure-5.svg, but no passed evidence covers that path. | `add_path_specific_release_evidence` |
| medium | `CLAIM_PATH_NOT_COVERED_BY_EVIDENCE` | Release note rn-103 cites data/public/cohort-clean.csv, but no passed evidence covers that path. | `add_path_specific_release_evidence` |
| medium | `EXPORT_MANIFEST_MISSING_RELEASE_NOTE` | Export manifest does not list public release note rn-103. | `add_release_note_to_export_manifest` |

## Evidence Coverage

| Release note | Claim type | Changed artifacts | Passed evidence | Required evidence |
| --- | --- | ---: | ---: | --- |
| rn-101 | api | 1 | 1 | test, export |
| rn-102 | reproducibility | 1 | 0 | reproduction |
| rn-103 | dataset | 0 | 1 | data-diff, checksum |

Synthetic data only. No Git provider, DOI provider, CI system, private repository, payment account, credential, or external API is contacted.
