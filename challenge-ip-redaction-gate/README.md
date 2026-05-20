# Challenge IP Redaction Gate

Self-contained milestone for SCIBASE.AI issue #18, Scientific Bounty System.

This module protects solver intellectual property during scientific bounty
evaluation. It gives sponsors and reviewers useful evidence packets while
withholding unpaid proprietary content until the challenge has funded and
settled the relevant award.

## What It Covers

- Sponsor preview packets that redact unpaid solver IP.
- Reviewer packets with NDA and role-aware disclosure controls.
- Private challenge and NDA readiness checks before sponsor access.
- Settlement-gated IP transfer after funded payout.
- Deterministic audit digests for arbitration-ready evidence.
- Synthetic sample data only; no network, credentials, or external services.

## Files

- `index.js` - disclosure policy engine.
- `demo.js` - terminal demo for sponsor/reviewer/settlement flows.
- `test.js` - dependency-free regression tests.
- `demo.mp4` - short demo artifact for the bounty review flow.

## Run

```sh
node challenge-ip-redaction-gate/test.js
node challenge-ip-redaction-gate/demo.js
```

## Requirement Map

| Issue #18 Requirement | Implementation |
| --- | --- |
| Challenge posting portal with public/private support | `validateChallengeDisclosure()` blocks private or sensitive challenge previews unless NDA and IP policies are configured. |
| Secure submission engine | `buildDisclosurePacket()` turns submission artifacts into role-specific evidence packets without exposing unpaid protected content. |
| Anonymous or named participation | Submission `team.displayMode` and audit metadata keep the solver identity separate from artifact disclosure decisions. |
| Arbitration and reward distribution | Deterministic `auditDigest` values and `withheldArtifacts` create reviewer/arbitrator evidence without leaking raw IP. |
| IP management options | `settlement.status === "funded_settled"` is required before sponsor packets disclose protected content or mark `ipTransferReady`. |
| Feedback loop between submitters and sponsors | Packets include `requiredActions` explaining the exact gating reason and remediation path. |
