# Project Ownership Succession Guard

This contribution adds a focused guardrail for SCIBASE's User & Project Management layer. It evaluates project ownership transfer requests when a workspace owner is inactive, has left an institution, is unreachable, or when a project risks becoming orphaned.

The slice is intentionally narrow. It does not rebuild RBAC, invitation flows, offboarding, visibility transitions, deletion, or archive handoff. It covers the succession decision itself: who can inherit control of a scientific workspace, what approvals are required, and how attribution and compliance holds stay intact.

## What It Checks

- A valid owner-inactivity, departure, suspension, legal, or institutional succession trigger.
- Whether the proposed owner has a succession-eligible role such as admin, co-owner, PI, data steward, or institutional steward.
- Fresh identity verification and MFA posture for the successor.
- Independent approval through an institutional steward, data steward plus co-owner quorum, or legal authority.
- Compliance approval when the project contains IRB, DUA, clinical, embargoed, human-subjects, or export-controlled holds.
- Complete collaborator notice and a meaningful objection window.
- Preservation of original owner credit, contribution history, and a public transfer receipt.
- Open ownership disputes or competing successor claims.
- Immutable audit receipts for the transfer packet.

## Running Locally

```bash
npm test
npm run demo
npm run check
npm run video
```

The demo uses only synthetic packets in `data/sample_succession_packets.json`.

Generated files:

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.mp4`

The MP4 is generated from an FFmpeg color source and drawtext slate. It is not a screen recording and contains no desktop capture or private information.

## Why This Matters

Scientific workspaces often outlive a single account owner. A PI can leave, an institutional email can disappear, a lab can close, or an owner may become unreachable while collaborators still need to preserve datasets, manuscripts, audit evidence, and attribution.

Without an explicit succession guard, platforms can drift toward two bad outcomes:

1. Workspaces become orphaned and cannot be responsibly maintained.
2. A contributor or administrator takes over without enough independent approval, notice, or compliance review.

This guard creates a reviewer-ready decision packet so SCIBASE can freeze risky transfers, preserve original credit, and approve clean succession requests with auditable evidence.
