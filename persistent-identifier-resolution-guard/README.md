# Persistent Identifier Resolution Guard

This module adds a focused persistent identifier and resolver readiness gate for SCIBASE Scientific/Engineering Data & Code Hosting.

It evaluates whether hosted research artifacts are ready for public release with stable DOI, ARK, UUID, or persistent URL records. It is intentionally dependency-free, synthetic-data-only, and offline. It uses captured resolver evidence instead of making live calls to DOI or ARK services.

## What It Checks

- DOI, ARK, UUID, and persistent URL presence and shape.
- Active identifier collisions across hosted artifacts.
- Landing page availability and resolver target consistency.
- Fresh captured resolver evidence before public release.
- DataCite metadata completeness for DOI registration.
- schema.org discovery metadata for search and aggregator indexing.
- Restricted-access routing so persistent links do not expose direct downloads.
- Version-chain integrity for replaced artifacts.
- Tombstone metadata for superseded or withdrawn artifacts.

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
- `review`: no blockers, but a reviewer should inspect stale or incomplete evidence.
- `hold`: public release should be held until resolver, metadata, access, version, or tombstone blockers are cleared.

Each result includes deterministic blocker codes, remediation actions, a reviewer packet, and an audit digest.
