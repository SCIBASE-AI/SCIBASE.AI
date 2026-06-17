# Assistant Output Disclosure Report

As of: 2026-06-18

## Summary

- Total packets: 5
- Release: 1
- Review: 1
- Hold: 3

## Packet Decisions

| Packet | Mode | Visibility | Decision | Primary reason |
| --- | --- | --- | --- | --- |
| Sanitized internal peer-review note | auto-peer-review | team | RELEASE_OUTPUT | All disclosure checks passed |
| Peer-review note with direct identifiers | auto-peer-review | external-review | HOLD_OUTPUT | DOUBLE_BLIND_IDENTITY_LEAK: Double-blind output appears to reveal reviewer identity. |
| Reproducibility note with private storage | reproducibility-checker | public | HOLD_OUTPUT | DATA_USE_EVIDENCE_MISSING: Restricted assistant output lacks data-use evidence. |
| Research gap feed with missing source support | research-gap-finder | team | REVIEW_BEFORE_RELEASE | UNSUPPORTED_HIGH_IMPACT_CLAIM: Found 1 high-impact claim(s) without source support. |
| Assistant note with instruction leakage | auto-peer-review | team | HOLD_OUTPUT | PROMPT_OR_INSTRUCTION_LEAK: Generated text appears to expose prompt, system, or instruction content. |

## Remediation Actions

### Sanitized internal peer-review note
- Release assistant output to the configured audience.

### Peer-review note with direct identifiers
- Redact direct identifiers and rerun disclosure review before release.
- Replace reviewer names with role-neutral labels before release.
- Attach human approval before releasing restricted output.
- Run and attach redaction review evidence.
- Add a de-identification summary for reviewer replay.
- Rewrite claims with source support or downgrade the language.

### Reproducibility note with private storage
- Redact direct identifiers and rerun disclosure review before release.
- Keep assistant output private until the embargo expires.
- Attach human approval before releasing restricted output.
- Run and attach redaction review evidence.
- Attach data-use agreement or mark the output non-releasable.

### Research gap feed with missing source support
- Rewrite claims with source support or downgrade the language.

### Assistant note with instruction leakage
- Suppress output and inspect the assistant prompt chain.
