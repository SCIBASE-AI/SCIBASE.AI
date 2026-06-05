# Export-Control Data Transfer Guard Report

Generated: 2026-06-05T12:40:00.000Z

## Reviewer Summary

This guard prevents a Scientific Bounty System challenge from opening data-room access, solver workspaces, or reward release before export-control and restricted-data transfer risks are cleared.

## Blocked Sample

Challenge: `bio-agent-open-prize`

Decision: `hold`

Blockers:

- Missing export classification for `controlled-biological-agent`.
- Restricted participant jurisdiction present: `IR`.
- Missing data-use agreement for `genomic-data` and `clinical-trial-data`.

Warnings:

- Missing cross-border transfer audit log.
- Missing NDA workflow.
- Missing payout sanctions or payout-eligibility screening.

Required action:

Resolve all blocker findings before challenge publication or data-room access. Add audit controls before opening private workspaces or payout routing.

## Releasable Sample

Challenge: `open-climate-forecast`

Decision: `release`

Reason:

The challenge uses public weather data, has no restricted topic hits, records export classification, includes a data-use agreement, enables access logging, and screens payout eligibility.

## Issue #18 Fit

This maps to the Scientific Bounty System requirements by adding a pre-publication trust gate for:

- challenge posting readiness,
- secure submission workspaces,
- private data-room access,
- arbitration evidence,
- prize payout routing,
- IP handoff after payment.

