# Collaborative Alt Text Export Guard

- Document: Blinded neuroimaging collaboration
- Decision: hold_accessible_export
- Export allowed: no
- Findings: 3
- Digest: 76c61e090701f62d8a84fb15d6cb8120d1e3183c47c83c62f8560c6a6e16f00f

## Summary

- Critical: 2
- High: 0
- Warning: 1
- Info: 0

## Findings

### 1. THIN_OR_GENERIC_ALT_TEXT

- Severity: warning
- Path: artifacts[0].altText
- Message: Alt text for fig-3 is too thin or generic.
- Evidence: Detected 17 words and generic visual phrasing.
- Remediation: Describe the key variables, trend, and scientific conclusion without relying on sight.

### 2. PRIVATE_PATH_OR_DATA_LEAK

- Severity: critical
- Path: artifacts[0].altText
- Message: Alt text for fig-3 exposes private path or protected data marker.
- Evidence: Accessible exports must not leak blinded-review notes, private paths, or protected data.
- Remediation: Rewrite the alt text using public manuscript language only.

### 3. REVIEWER_IDENTITY_LEAK

- Severity: critical
- Path: artifacts[0].altText
- Message: Alt text for fig-3 exposes reviewer identity material.
- Evidence: Accessible exports must not leak blinded-review notes, private paths, or protected data.
- Remediation: Rewrite the alt text using public manuscript language only.
