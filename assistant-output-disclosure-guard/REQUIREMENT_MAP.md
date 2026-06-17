# Requirement Map

| Issue requirement | Implementation |
| --- | --- |
| Auto peer review reports | Checks peer-review assistant drafts for direct identifiers, reviewer leaks, unsupported claims, and missing redaction evidence before release. |
| Claims vs. evidence alignment | Reviews high-impact assistant claims for citation anchors and source support markers. |
| Reproducibility checker | Blocks reproducibility assistant output that exposes private storage links, internal run IDs, or non-redacted environment details. |
| Research gap finder | Reviews opportunity-feed text for embargoed project leakage and private lab capability exposure. |
| Real-time insights with rigor | Produces deterministic RELEASE, REVIEW, and HOLD decisions with remediation actions. |
| Project safety before public release | Enforces audience, embargo, double-blind, and human-approval gates before assistant output is visible. |
| Reviewer-ready evidence | Demo script generates JSON, Markdown, SVG, transcript, and MP4 artifacts for local replay. |
| Safe contribution boundary | Uses only synthetic packets and no external APIs, credentials, private manuscripts, or live data. |

## Distinct slice statement

This contribution focuses only on disclosure safety for generated assistant output. It does not implement a general AI assistant, citation retraction checks, dependency reproducibility, model assumptions, reviewer calibration, sample custody, structured abstracts, preregistration consistency, or external-validity transfer.
