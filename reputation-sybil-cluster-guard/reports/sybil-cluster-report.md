# Reputation Sybil Cluster Guard: cluster-rho-17

Review window: **2026-06**
Decision: **quarantine-cluster**
Risk score: **100/100**

Findings: 4 blockers, 3 warnings.

## BLOCK: MISSING_CLUSTER_QUARANTINE
Blocking sybil signals exist but reputation, ranking, or payout controls are not fully paused.

Evidence: `{"quarantineApplied":false,"manualReviewTicket":null,"leaderboardSuppressed":false,"payoutEligibilityPaused":false}`

Remediation: Apply quarantine, suppress leaderboard rank, pause payout eligibility, and open a manual review ticket.

## BLOCK: RECYCLED_DEVICE_FINGERPRINT
Three or more accounts share a device fingerprint inside the same review window.

Evidence: `{"fingerprint":"fp-77","userIds":["u-104","u-105","u-106"]}`

Remediation: Quarantine the cluster and suppress leaderboard movement until reviewed.

## BLOCK: SELF_REVIEW_RING_RISK
Reviewer and submitter relationships form a high-score ring across bounty projects.

Evidence: `{"edges":["u-104->u-105@bounty-1","u-105->u-106@bounty-1","u-106->u-104@bounty-2"]}`

Remediation: Suppress review-derived reputation and route the cluster to trust-and-safety review.

## BLOCK: SHARED_PAYOUT_HANDLE
Multiple reputation accounts share the same payout handle.

Evidence: `{"payoutHandle":"wallet-alpha","userIds":["u-104","u-105"]}`

Remediation: Pause payout eligibility and require identity review before reputation points affect bounty access.

## WARN: BURST_ENDORSEMENT_RING
Several endorsements were created immediately after signup.

Evidence: `{"count":4,"edges":["u-104->u-105","u-105->u-106","u-106->u-104","u-107->u-104"]}`

Remediation: Delay endorsement credit until accounts age past the configured trust window.

## WARN: HIGH_REPUTATION_DELTA_UNDER_RISK
The cluster gained enough reputation to affect rankings or bounty eligibility while risk signals are present.

Evidence: `{"totalReputationDelta":119}`

Remediation: Hold reputation deltas until the cluster review is resolved.

## WARN: SUSPICIOUS_INVITATION_CHAIN
A non-seed account invited multiple high-velocity reputation accounts.

Evidence: `{"inviter":"u-101","invitees":["u-104","u-105"]}`

Remediation: Require manual review before granting invitation-derived reputation boosts.
