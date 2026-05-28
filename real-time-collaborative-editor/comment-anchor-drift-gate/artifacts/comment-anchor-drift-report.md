# Comment Anchor Drift Gate

## Summary

- Anchor packets reviewed: 5
- Ready: 2
- Blocked: 3
- Findings: 4

## Reports

### doc-clean-methods

- Revision: rev-001
- Decision: ready
- Comments reviewed: 1

### doc-missing-anchor

- Revision: rev-002
- Decision: block
- Comments reviewed: 1
  - block: missing_anchor_quote - comment-2 quoted text no longer exists and no replacement anchor was provided.

### doc-section-drift

- Revision: rev-003
- Decision: block
- Comments reviewed: 1
  - block: section_drift - comment-3 moved from Limitations to Discussion.
  - hold: large_anchor_movement - comment-3 moved 220 characters, above the trusted movement threshold.

### doc-notebook-output

- Revision: rev-004
- Decision: block
- Comments reviewed: 1
  - block: stale_notebook_output_anchor - comment-4 targets notebook output whose execution record changed.

### doc-manual-confirmation

- Revision: rev-005
- Decision: ready
- Comments reviewed: 1

