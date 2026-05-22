# Acceptance Notes

## Reviewer Path

1. Run `npm run check`.
2. Run `npm test`.
3. Run `npm run demo`.
4. Inspect `reports/summary.json` and `reports/deposit-reconciliation-packet.md`.
5. Confirm `reports/summary.svg` and `reports/demo.mp4` exist after artifact generation.

## Expected Demo Outcome

- Overall status is `hold_repository_reconciliation`.
- One repository target is verified.
- One repository target is held because the indexed repository record has mismatched identifier, version, checksum, license, access, embargo, ORCID, and webhook evidence.
- One repository target is in follow-up because the repository accepted but has not indexed the package and is missing non-blocking metadata/acknowledgement evidence.

## Scope Boundaries

- Uses synthetic data only.
- Does not call external repository APIs or use credentials.
- Does not replace export generation, webhook replay, connector certification, or dashboard modules.
- Focuses on the enterprise proof step after export submission and before compliance/dashboard completion.
