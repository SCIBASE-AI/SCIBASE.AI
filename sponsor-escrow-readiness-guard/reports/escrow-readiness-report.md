# Sponsor Escrow Readiness Report

Generated: 2026-06-02T00:00:00.000Z

## Clean Packet

Decision: release

### challenge-biomarker-001

Decision: release

- No findings.

## Risky Packet

Decision: hold

### challenge-quantum-042

Decision: hold

- BLOCK ESCROW_EVIDENCE_MISSING: challenge-quantum-042 lacks sponsor escrow evidence. Attach escrow provider and evidence ID before accepting submissions.
- BLOCK ESCROW_UNDERFUNDED: challenge-quantum-042 escrow holds 42000, below advertised prize 80000. Fund the escrow to at least the advertised prize before challenge launch.
- BLOCK SPONSOR_RELEASE_AUTH_MISSING: challenge-quantum-042 has no sponsor release authorization on file. Record sponsor release approval before the prize is advertised as payable.
- BLOCK ESCROW_EXPIRES_BEFORE_AWARD: challenge-quantum-042 escrow expires before the award decision date. Extend escrow validity beyond the award decision and dispute window.
- REVISE ESCROW_EVIDENCE_STALE: challenge-quantum-042 escrow verification is older than 30 days. Refresh escrow evidence before opening or continuing submissions.
- BLOCK PAYOUT_TOTAL_MISMATCH: challenge-quantum-042 payout schedule totals 60000, but advertised prize is 80000. Reconcile milestone and final payout rows to the exact advertised prize.
- REVISE PAYOUT_ROUTE_INCOMPLETE: challenge-quantum-042 has a payout row without release trigger or destination class. Add release trigger and solver/team/institution destination class to each payout row.

### challenge-climate-forecast-017

Decision: hold

- BLOCK UNSUPPORTED_CURRENCY: challenge-climate-forecast-017 uses unsupported prize currency POINTS. Convert the challenge prize to a supported payout currency before launch.
- BLOCK PAYOUT_SCHEDULE_MISSING: challenge-climate-forecast-017 does not define milestone or final payout routing. Attach a payout schedule before solver submissions open.
