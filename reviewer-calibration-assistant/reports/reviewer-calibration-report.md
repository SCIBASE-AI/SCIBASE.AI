# Reviewer Calibration Assistant Report

| Field | Value |
| --- | --- |
| Project | proj-neuro-118 |
| Manuscript | ms-gapfinder-204 |
| Reviewers | 3 |
| Decision | calibrate_before_release |
| Pairwise agreement | 0.667 |
| Consensus action | major_revision (0.333) |

## Blockers
- low_inter_rater_agreement
- weak_recommendation_consensus
- severe_score_divergence
- domain_template_drift
- insufficient_evidence_coverage
- blind_mode_escalation_required

## Required Actions
- Run reviewer calibration on divergent scoring dimensions before author-facing release.
- Request adjudication because recommendation consensus is below threshold.
- Ask reviewers to justify high-spread score dimensions with evidence anchors.
- Normalize all reviews to the configured domain template.
- Require evidence anchors for unsupported claim checks.
- Keep disputed packets double-blind until calibration is resolved.
