# Requirement Map

| Issue requirement | Implementation |
| --- | --- |
| Structured peer reviews and comments | Validates review visibility, anonymous/double-blind redaction, and semi-private export permission before dossier release. |
| Review history tracked on profiles | Ensures reviewer-safe history is exportable only when visibility rules allow it. |
| Contributor credits | Requires CRediT-style contribution evidence links and timestamps before institutional export. |
| Visible credit on researcher profiles and citation pages | Checks profile export purpose, opt-out state, and contributor consent. |
| Reputation scoring | Reviews score deltas and badge evidence freshness before reputation is used in promotion or grant packets. |
| Institutional reporting and promotion support | Produces deterministic RELEASE, REVIEW, and HOLD decisions for tenure, promotion, annual-review, and grant-report exports. |
| Reviewer-ready evidence | Demo script generates JSON, Markdown, SVG, transcript, and MP4 artifacts from synthetic dossier packets. |
| Safe contribution boundary | Uses synthetic records only; no live people, credentials, private profile stores, HR systems, or external APIs. |

## Distinct slice statement

This contribution focuses only on institution-facing reputation dossier export readiness. It does not implement general scoring, CRediT role validation, contributor attestation, workload equity, leaderboard privacy, abuse detection, probation/reinstatement, appeal evidence, or peer-review evidence recertification.
