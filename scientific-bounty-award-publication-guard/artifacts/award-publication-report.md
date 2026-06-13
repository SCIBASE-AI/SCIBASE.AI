# Award Publication Readiness Report

Generated: 2026-06-12T00:00:00Z

## Summary

- Blocking findings: 5
- Review findings: 3
- Passing findings: 20

## Challenge Decisions

### biomarker-single-cell-2026

- Decision: RELEASE_PUBLICATION
- Award: award-ready-001
- Payout state: released
- Public mode: public_challenge_public_award

| Severity | Code | Message | Remediation |
| --- | --- | --- | --- |
| pass | award_decision_ready | Award decision and sponsor approval are present. | No remediation required. |
| pass | payout_ready | Payout state allows public award publication. | No remediation required. |
| pass | appeal_window_closed | Appeal window is closed. | No remediation required. |
| pass | ip_terms_ready | IP or license terms allow publication. | No remediation required. |
| pass | embargo_clear | No active embargo blocks publication. | No remediation required. |
| pass | privacy_release_ready | Publication privacy mode is satisfied. | No remediation required. |
| pass | named_consent_ready | All named recipients consented to public announcement. | No remediation required. |
| pass | award_splits_ready | Award splits and recipient publication terms are complete. | No remediation required. |
| pass | reproducibility_manifest_ready | Reproducibility manifest has public claim evidence. | No remediation required. |

### climate-forecast-region-pack

- Decision: HOLD_FOR_REVIEW
- Award: award-hold-002
- Payout state: authorized
- Public mode: public_challenge_public_award

| Severity | Code | Message | Remediation |
| --- | --- | --- | --- |
| pass | award_decision_ready | Award decision and sponsor approval are present. | No remediation required. |
| pass | payout_ready | Payout state allows public award publication. | No remediation required. |
| pass | appeal_window_closed | Appeal window is closed. | No remediation required. |
| pass | ip_terms_ready | IP or license terms allow publication. | No remediation required. |
| review | embargo_active | Publication embargo remains active until 2026-06-20T00:00:00.000Z. | Hold public publication until the embargo expires. |
| pass | privacy_release_ready | Publication privacy mode is satisfied. | No remediation required. |
| pass | named_consent_ready | All named recipients consented to public announcement. | No remediation required. |
| pass | award_splits_ready | Award splits and recipient publication terms are complete. | No remediation required. |
| pass | reproducibility_manifest_ready | Reproducibility manifest has public claim evidence. | No remediation required. |

### private-quantum-noise-reduction

- Decision: BLOCK_PUBLICATION
- Award: award-block-003
- Payout state: pending
- Public mode: private_challenge_public_award

| Severity | Code | Message | Remediation |
| --- | --- | --- | --- |
| pass | award_decision_ready | Award decision and sponsor approval are present. | No remediation required. |
| block | payout_not_authorized | Public winner publication requires an authorized, released, or paid payout state. | Move payout to authorized, released, or paid before publishing named winners. |
| pass | appeal_waived | Appeal window was explicitly waived. | No remediation required. |
| block | ip_transfer_incomplete | IP transfer publication requires signed handoff and released or paid payout. | Complete signed IP handoff and release or pay the payout before publication. |
| pass | embargo_clear | No active embargo blocks publication. | No remediation required. |
| block | private_content_unredacted | Private or NDA challenge content needs approved public redaction before award publication. | Approve a public redaction packet for private challenge content. |
| review | named_consent_missing | Named publication consent missing for solver-epsilon. | Collect named publication consent or publish anonymized winners. |
| block | award_splits_invalid | Award split percentages must sum to 100; received 90. | Correct award splits so recipient percentages total exactly 100. |
| block | recipient_terms_missing | Publication terms missing for solver-epsilon. | Collect publication terms from each payout recipient. |
| review | reproducibility_manifest_incomplete | Public claims should include artifact hash and result digest. | Attach artifact hash and result digest before publishing technical claims. |

