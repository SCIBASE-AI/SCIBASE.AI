# Project Deletion And Erasure Guard

This module is a focused User & Project Management slice for SCIBASE.AI issue
#11. It evaluates irreversible project deletion and researcher profile erasure
requests before project, profile, attribution, audit, and access-control state
is destroyed.

The implementation is self-contained and synthetic-data-only. It does not call
OAuth, SAML, ORCID, identity providers, live project systems, or production
access-control services.

## Coverage

- Requires verified requester identity and fresh MFA proof.
- Enforces project-owner/admin/steward authority before finalization.
- Blocks destructive deletion while legal, IRB, funder, publication-review, or
  restricted-data retention holds remain active.
- Requires co-owner consent before deleting shared project spaces.
- Converts public DOI/citation/forked projects to citation-safe tombstones
  instead of hard deletion.
- Preserves anonymous-review escrow receipts for appeals without exposing
  identity.
- Detaches erased researcher profiles while preserving minimal attribution
  hashes on authored projects and reviews.
- Enforces recovery windows and minimized audit receipt retention.
- Emits deterministic audit digests for reviewer packets.

## Local Validation

```bash
npm run check
npm test
npm run demo
```

The demo writes:

- `reports/deletion-erasure-packet.json`
- `reports/deletion-erasure-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

## Bounty Non-Overlap

This is not another broad workspace/RBAC ledger, identity recovery guard,
privacy access review, member lifecycle/offboarding flow, institutional
recertification module, anonymous-review escrow-only module, identity
merge/export ledger, data-room consent ledger, researcher profile sync guard,
project archive handoff guard, access-audit anomaly monitor, role delegation
guard, invitation-domain/MFA gate, funding-attribution guard, or service-token
governance module. It focuses specifically on finalization of irreversible
deletion and profile-erasure requests.
