# Collaborative Alt Text Export Guard

- Document: Shared wetland recovery manuscript
- Decision: revise_before_export
- Export allowed: no
- Findings: 12
- Digest: 607b93c7dd47480c767a1c1c82689037a95376fdeb97edea7a45d46941ff1fb3

## Summary

- Critical: 0
- High: 7
- Warning: 5
- Info: 0

## Findings

### 1. THIN_OR_GENERIC_ALT_TEXT

- Severity: warning
- Path: artifacts[0].altText
- Message: Alt text for fig-2 is too thin or generic.
- Evidence: Detected 4 words and generic visual phrasing.
- Remediation: Describe the key variables, trend, and scientific conclusion without relying on sight.

### 2. COMPLEX_VISUAL_NEEDS_LONG_DESCRIPTION

- Severity: high
- Path: artifacts[0].longDescription
- Message: Complex figure fig-2 lacks a long description or data summary.
- Evidence: Dense scientific visualizations need a structured non-visual explanation.
- Remediation: Add a long description or machine-readable data summary for complex figures.

### 3. COLOR_ONLY_ENCODING

- Severity: high
- Path: artifacts[0]
- Message: Artifact fig-2 relies on color-only interpretation.
- Evidence: Color-only distinctions are not accessible to all readers or output formats.
- Remediation: Add shape, pattern, label, or textual encoding alongside color.

### 4. ALT_TEXT_STALE_SOURCE_HASH

- Severity: high
- Path: artifacts[0].altTextSourceHash
- Message: Alt text for fig-2 was reviewed against an older source artifact.
- Evidence: Expected source hash sha256:map-current; found sha256:map-old.
- Remediation: Regenerate or re-approve alt text after the source data or rendering changes.

### 5. ALT_TEXT_REVIEW_STALE

- Severity: high
- Path: artifacts[0].altTextReviewedAt
- Message: Alt text for fig-2 predates the latest artifact edit.
- Evidence: Artifact updated at 2026-05-31T18:00:00.000Z; alt text reviewed at 2026-05-31T17:00:00.000Z.
- Remediation: Re-review alt text after collaborative edits.

### 6. UNRESOLVED_ACCESSIBILITY_COMMENT

- Severity: high
- Path: comments.c-2
- Message: Blocking accessibility comment remains open on fig-2.
- Evidence: Alt text must describe the nutrient gradient and not just the visual map.
- Remediation: Resolve or explicitly waive blocking accessibility comments before export.

### 7. LOCKED_SECTION_ALT_TEXT_UNAPPROVED

- Severity: high
- Path: artifacts[0].altTextChangedInLock
- Message: Alt text changed inside locked section results without approval.
- Evidence: Final review locks should protect export wording for scientific artifacts.
- Remediation: Collect a locked-section accessibility approval or reopen the section for review.

### 8. MISSING_ACCESSIBLE_EXPORT_APPROVAL

- Severity: warning
- Path: accessibilityApprovals
- Message: Artifact fig-2 has no accessible-export approval.
- Evidence: A reviewer sign-off makes export readiness auditable.
- Remediation: Record accessibility review approval after alt text and descriptions are current.

### 9. THIN_OR_GENERIC_ALT_TEXT

- Severity: warning
- Path: artifacts[1].altText
- Message: Alt text for tbl-2 is too thin or generic.
- Evidence: Detected 7 words and too little detail.
- Remediation: Describe the key variables, trend, and scientific conclusion without relying on sight.

### 10. TABLE_HEADER_SCOPE_MISSING

- Severity: high
- Path: artifacts[1].columns[0]
- Message: Table tbl-2 column 1 lacks header or scope metadata.
- Evidence: Screen readers depend on explicit header scope for scientific tables.
- Remediation: Add header text and row/column scope metadata.

### 11. TABLE_SUMMARY_MISSING

- Severity: warning
- Path: artifacts[1].tableSummary
- Message: Table tbl-2 has no concise table summary.
- Evidence: A summary helps readers understand table purpose before navigating cells.
- Remediation: Add a short table summary that names rows, columns, units, and main comparison.

### 12. MISSING_ACCESSIBLE_EXPORT_APPROVAL

- Severity: warning
- Path: accessibilityApprovals
- Message: Artifact tbl-2 has no accessible-export approval.
- Evidence: A reviewer sign-off makes export readiness auditable.
- Remediation: Record accessibility review approval after alt text and descriptions are current.
