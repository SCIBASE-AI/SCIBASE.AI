# Collaborative LaTeX Macro Safety Guard

Synthetic reviewer packet for SCIBASE-AI/SCIBASE.AI#12.

## Summary

| Packet | Named version | Status | Blocking issues | Warnings |
| --- | --- | --- | ---: | ---: |
| packet-safe-methods-v4 | Manuscript v4 Methods | ready | 0 | 0 |
| packet-trusted-supplement-v2 | Supplement Draft | needs_review | 0 | 1 |
| packet-unsafe-results-v8 | Final Submission | blocked | 10 | 0 |

## Gate Totals

- Ready packets: 1
- Needs review: 1
- Blocked packets: 1
- Blocking issues: 10
- Warnings: 1

## Remediation Queue

- packet-trusted-supplement-v2 TRUSTED_MACRO_REVIEW_REQUIRED (\annotate): Keep the trusted-render justification with reviewer signoff.
- packet-unsafe-results-v8 EXTERNAL_RENDER_RESOURCE_BLOCKED (figure-caption): Replace external resources with repository-managed figure or citation assets.
- packet-unsafe-results-v8 EXTERNAL_RENDER_RESOURCE_BLOCKED (unsafe-inline-html): Replace external resources with repository-managed figure or citation assets.
- packet-unsafe-results-v8 LOCKED_SECTION_RENDER_HOLD (results-figures): Hold render/export until the section owner approves the macro packet.
- packet-unsafe-results-v8 MACRO_DEFINITION_CONFLICT (\hazard): Resolve the macro conflict before broadcasting the shared render state.
- packet-unsafe-results-v8 RAW_HTML_IN_COLLAB_BLOCK (unsafe-inline-html): Strip active HTML before live preview or named-version export.
- packet-unsafe-results-v8 RECURSIVE_MACRO_EXPANSION (\loopA): Break the macro cycle before live preview or export rendering.
- packet-unsafe-results-v8 RECURSIVE_MACRO_EXPANSION (\loopB): Break the macro cycle before live preview or export rendering.
- packet-unsafe-results-v8 UNAPPROVED_MACRO_EDIT (\dataset): Require approval before autosave promotes this macro into the named version.
- packet-unsafe-results-v8 UNSAFE_MACRO_COMMAND (\dataset): Remove the unsafe command or move it behind an approved trusted-render packet.
- packet-unsafe-results-v8 UNSAFE_MACRO_COMMAND (\hazard): Remove the unsafe command or move it behind an approved trusted-render packet.

## Requirement Mapping

- Macro and equation safety: Rich Scientific Formatting: Markdown, LaTeX, equations, and cross references
- Multi-user macro edit checks: Real-Time Collaboration: multi-user edits with live render safety
- Locked section render holds: Real-Time Collaboration: controlled sections and lock/unlock modes
- Named-version export gate: Version History & Autosave: safe named-version export
