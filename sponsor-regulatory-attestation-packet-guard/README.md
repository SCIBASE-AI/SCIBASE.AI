# Sponsor Regulatory Attestation Packet Guard

This module adds a focused Scientific Bounty System control for SCIBASE issue #18. It evaluates synthetic sponsor compliance packets before a scientific challenge opens for submissions. The goal is to keep sponsor-side regulatory paperwork from being confused with solver payout eligibility, escrow accounting, review scoring, submission packaging, or team split routing.

The guard is dependency-free and does not call payment systems, sanctions vendors, tax systems, identity providers, sponsor repositories, or external services. It only evaluates local synthetic evidence for sponsor legal identity, authorized signer approval, source-of-funds attestation, restricted-party screening, tax reporting readiness, export-control classification, regulated-domain review, public rules digest, and compliance contact readiness.

## What It Catches

- Challenges backed by an unidentified sponsor or missing signer authority evidence.
- Missing or stale source-of-funds attestations.
- Third-party prize funding without an upstream sponsor disclosure digest.
- Blocked, review-needed, stale, or unresolved beneficial-owner sanctions screening.
- High-value prizes without a sponsor-side tax reporting plan.
- Cross-border payout expectations without withholding review.
- Restricted export-control classifications without counsel approval.
- Regulated challenge domains without a regulatory review packet.
- Missing immutable public rules, cancellation/refund language, or compliance contact details.

## Outputs

- Challenge statuses: `ready_to_open`, `hold_for_compliance`, or `block_challenge`.
- Overall decision: `ready_to_open`, `hold_for_compliance_review`, or `block_challenge_publication`.
- Deterministic findings with severity, evidence, and remediation.
- Sponsor packet digests and an audit digest for repeatable review.
- JSON, Markdown, SVG, and MP4 demo artifacts under `reports/`.

## Usage

```bash
npm run check
npm test
npm run demo
```

The demo writes:

- `reports/sponsor-regulatory-attestation-packet.json`
- `reports/sponsor-regulatory-attestation-report.md`
- `reports/summary.svg`
- `reports/demo.mp4` when `ffmpeg` is available

## Scope Boundaries

This is separate from existing issue #18 work on intake, challenge rubrics, submission workspaces, evidence freezes, arbitration, payout routing, team split ledgers, escrow readiness, payout eligibility, duplicate solver detection, sponsor scorecards, review integrity, appeals, deadline fairness, benchmark leakage, data-use agreements, human-subjects compliance, award transparency, and closeout retention. It focuses only on sponsor-side regulatory attestation before a challenge can open lawfully.
