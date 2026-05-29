# Institutional Repository Sync SLA Guard

Generated: 2026-05-29T00:00:00.000Z
Report digest: `b694760bd00672e8fd0c17f288c6007b5b4312d327f0eff8adf051b753d581a8`

## Summary

- Total jobs: 4
- Ready: 1
- Needs review: 0
- Blocked: 3
- Findings: 7

## Decisions

### zenodo-open-access-overdue

- Decision: **blocked**
- Project: Single-cell reproducibility atlas
- Target: Zenodo (indexed-repository)
- Escalation: `route-to-research-office`
- Audit digest: `036ab26e31a2ab0b83954569ca3998b69bb6cd2bce0093b3cd974220502ac3b4`
- Findings:
  - blocker: mandate-deadline-missed - Horizon EU repository sync is 18 hour(s) overdue.
  - review: sync-backlog-risk - Sync has queued for 42 hour(s) with 5 retry attempt(s).
  - review: webhook-delivery-failed - Last institutional webhook delivery failed and requires admin visibility.

### pubmed-metadata-gap

- Decision: **blocked**
- Project: Clinical review supplement
- Target: PubMed Central (funder-portal)
- Escalation: `route-to-compliance-desk`
- Audit digest: `bf9ad08c2157beaaea1dd31169920d21829fc2303995826c52ec76d99e794c4e`
- Findings:
  - review: mandate-deadline-near - NIH deadline is within 36 hour(s).
  - blocker: metadata-incomplete - Repository export metadata is incomplete.
  - review: low-orcid-coverage - ORCID coverage is 67%, below the 90% admin threshold.

### arxiv-ready

- Decision: **ready**
- Project: Materials preprint export
- Target: arXiv (preprint-repository)
- Escalation: `release-to-sync-worker`
- Audit digest: `3c91a1816a086dc468584e4a6ff2c56657516e24b1f686f0616e69679d81a5ff`
- Findings:
  - info: none - No blocking or review findings.

### embargoed-dataset-hold

- Decision: **blocked**
- Project: Corporate R&D catalyst screen
- Target: Invenio (institutional-repository)
- Escalation: `route-to-sponsor-ops`
- Audit digest: `301fa177eba873f9fc1b77bd7521aaa2f725acccf76d8b033d8f59536aa03c22`
- Findings:
  - blocker: active-embargo - Repository sync is blocked by an active embargo for 17 day(s).
