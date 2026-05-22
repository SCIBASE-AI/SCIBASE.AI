# Collaborative Data Availability Statement Guard

Manuscript: Joint Galaxy Morphology Review
Issue: SCIBASE-AI/SCIBASE.AI#12
Decision: block-export-until-availability-evidence-is-clean
Score: 0

## Severity Summary

| Severity | Count |
| --- | ---: |
| critical | 2 |
| high | 5 |
| medium | 2 |
| low | 0 |

## Findings

- **medium / embargo-release-lags-export**: Processed synthetic tables releases 11 days after the manuscript export deadline.
  - Action: Confirm the target journal accepts this availability timing before final export.
  - Refs: repo-data-processed, 2026-06-05
- **high / reviewer-link-expires-before-review-window**: Processed synthetic tables reviewer access expires in 1 days.
  - Action: Refresh reviewer-only links before export so peer reviewers can inspect restricted artifacts.
  - Refs: repo-data-processed, 2026-05-23
- **critical / repository-accession-missing**: Reviewer note extracts has no stable accession or repository identifier.
  - Action: Attach a stable repository accession or mark the material as non-distributable with reviewer evidence.
  - Refs: repo-data-raw
- **high / dataset-license-missing-or-unaccepted**: Reviewer note extracts has dataset license none.
  - Action: Add an accepted dataset license or document why restricted access is required.
  - Refs: repo-data-raw
- **critical / human-derived-data-without-deidentification-evidence**: Reviewer note extracts contains human-derived material without de-identification evidence.
  - Action: Block export until the data steward links de-identification or restriction evidence.
  - Refs: repo-data-raw
- **high / reviewer-link-expires-before-review-window**: Reviewer note extracts reviewer access expires in -3 days.
  - Action: Refresh reviewer-only links before export so peer reviewers can inspect restricted artifacts.
  - Refs: repo-data-raw, 2026-05-19
- **high / required-availability-approver-missing**: Required data-steward approval is not complete.
  - Action: Hold export until all role-based collaborators approve the availability statement.
  - Refs: data-steward
- **high / blocking-availability-comment-open**: Blocking comment comment-17 remains open on data-availability.
  - Action: Resolve blocking availability comments before final manuscript export.
  - Refs: comment-17, data-availability
- **medium / availability-change-unmerged**: Pending change change-9 in data-availability has not been merged.
  - Action: Merge, reject, or explicitly defer the collaborative availability edit before export.
  - Refs: change-9, data-availability

## Safety

- Synthetic manuscript, repository, collaborator, and review data only
- No GitHub, Zenodo, journal, identity, storage, or email network calls
- No private manuscript content, human-subject records, credentials, or live export mutations
