# Credit Ledger Reputation Audit: Dr. Maya Chen

- Decision: hold-reputation-publication
- Risk score: 100
- Stored score: 112
- Computed score: 98
- Credit events reviewed: 5
- Audit digest: ec99535e924cc18c

## Findings

- [medium] DUPLICATE_CREDIT_EVENT (credit-002)
  - Credit credit-002 duplicates credit-001.
  - Recommendation: Merge duplicate credit events or mark the later entry as a correction.
- [high] INVALID_CREDIT_ROLE (credit-003)
  - Credit credit-003 uses non-CRediT role "Peer Review Leadership".
  - Recommendation: Map the contribution to a valid CRediT role before publishing the profile.
- [high] LATE_CREDIT_BACKFILL (credit-003)
  - Credit credit-003 was backfilled 39 days after contribution.
  - Recommendation: Require author approval and a visible audit note for late credit backfills.
- [critical] DISPUTED_CREDIT_INCLUDED (credit-003)
  - Credit credit-003 is under_review but still present in reputation input.
  - Recommendation: Exclude disputed credit from reputation totals until arbitration closes.
- [medium] UNSIGNED_CONTRIBUTION (credit-003)
  - Credit credit-003 has no contributor attestation timestamp.
  - Recommendation: Require contributor attestation for reputation-affecting credit.
- [low] MISSING_PROJECT_TIMELINE_LINK (credit-003)
  - Credit credit-003 is not linked to a project timeline or citation page.
  - Recommendation: Attach each credit event to a project timeline or citation page entry.
- [medium] LATE_CREDIT_BACKFILL (credit-005)
  - Credit credit-005 was backfilled 22 days after contribution.
  - Recommendation: Require author approval and a visible audit note for late credit backfills.
- [high] REPUTATION_COMPONENT_MISMATCH
  - Stored contributionCredit=40 differs from computed 36.
  - Recommendation: Recompute score components from the ledger and store the formula version.
- [high] REPUTATION_COMPONENT_MISMATCH
  - Stored peerReviewQuality=30 differs from computed 25.
  - Recommendation: Recompute score components from the ledger and store the formula version.
- [high] REPUTATION_COMPONENT_MISMATCH
  - Stored bountyCompletion=8 differs from computed 4.
  - Recommendation: Recompute score components from the ledger and store the formula version.
- [medium] BADGE_ELIGIBILITY_DRIFT
  - Badge Regional Leader no longer satisfies eligibility rules.
  - Recommendation: Revoke or hold badges whose eligibility inputs no longer pass thresholds.
- [high] REVIEW_QUALITY_OUTLIER
  - Review review-002 earned reputation despite weak quality/helpfulness signals.
  - Recommendation: Route low-quality high-volume reviews for moderation before awarding reputation.

## Reputation Components

- contributionCredit: 36
- attestationCoverage: 15
- peerReviewQuality: 25
- reproducibility: 12
- bountyCompletion: 4
- verifiedBadges: 6

## Publication Gates

- [!] All credit roles map to CRediT taxonomy.
- [!] Disputed credits are excluded from score inputs.
- [!] Stored reputation components match the transparent formula.
- [!] Badges match current score and verification inputs.
- [!] Peer review reputation is backed by quality/helpfulness signals.
