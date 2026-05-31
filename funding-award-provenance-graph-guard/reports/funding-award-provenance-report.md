# Funding Award Provenance Graph Guard

Status: **hold**

## Summary

- Records checked: 5
- Release: 1
- Review: 1
- Hold: 3
- Findings: 7

## Decisions

- funding-clean-nih: release (none)
- funding-coi-review: review (COI_RECOMMENDATION_NEEDS_REVIEW)
- funding-missing-award: hold (MISSING_AWARD_ID, MISSING_REQUIRED_ACKNOWLEDGEMENT)
- funding-doi-mismatch: hold (DOI_PROJECT_MISMATCH, AWARD_WINDOW_MISMATCH)
- funding-private-path: hold (UNKNOWN_FUNDER_ALIAS, PRIVATE_FUNDER_PATH_EXPOSED)

## Scope

This guard supports Scientific Knowledge Graph Integration by blocking unsafe funder, grant, award, project, output, and recommendation relationships before funding paths are published on entity pages or used in recommendations.
