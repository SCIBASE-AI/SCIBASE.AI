# Human Subjects Compliance Guard

This module adds a focused compliance gate for the SCIBASE Scientific Bounty System. It evaluates whether a scientific challenge submission that uses human-subject data is ready for sponsor review, scoring, payout, and IP transfer.

The guard is intentionally dependency-free and uses synthetic data only. It does not store, fetch, or process real patient or participant records.

## What It Checks

- IRB, ethics-board, exemption, or waiver evidence.
- Participant consent or waiver coverage by declared participant group.
- Data artifact privacy state, checksums, direct identifiers, and re-identification risk.
- HIPAA and GDPR control readiness, including DUA, lawful basis, minimum-necessary review, and transfer mechanism.
- Reviewer access controls, human-subjects training, conflict declarations, and least privilege.
- Reward and IP transfer gates so payout or transfer cannot happen before compliance approval.

## Run

```bash
npm run check
npm test
npm run demo
```

The demo writes `reports/summary.json`, `reports/reviewer-packet.md`, and `reports/summary.svg`.

## Output

The primary status is one of:

- `ready`: no blockers or warnings.
- `review`: no blockers, but a compliance reviewer should inspect warnings.
- `hold`: sponsor review, payout, and IP transfer should be held until blockers are cleared.

Each result includes deterministic blocker codes, remediation actions, a reviewer packet, and an audit digest.
