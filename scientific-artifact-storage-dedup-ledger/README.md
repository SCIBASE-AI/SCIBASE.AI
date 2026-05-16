# Scientific Artifact Storage Dedup Ledger

Scientific data and code hosting needs storage controls that understand content, versions, quotas, and executable artifact needs. This module evaluates synthetic artifact inventories for content-addressed deduplication, quota pressure, stale previews, large artifact routing, retention actions, and signed audit evidence.

## What It Covers

- Content-addressed blob inventory from uploaded artifact versions.
- Deduplication savings across duplicate datasets and exports.
- Project quota decisions using physical storage after dedupe.
- Large artifact routing for models and generated outputs.
- Stale preview invalidation before review or export.
- Hot, warm, and cold storage-tier recommendations.
- Synthetic sample data only; no credentials or real research artifacts.

## Run It

```bash
npm run check
npm test
npm run demo
```

## Demo Output

```text
Scientific artifact storage deduplication demo
As of 2026-05-16: 0 ready, 2 needs review, 1 blocked
Logical bytes: 3476029440; physical after dedup: 2742026240; savings: 734003200 (21%)
proj-neuro-atlas: needs_review logical=1363148800 physical=1048576000 savings=314572800 blockers=0 reviews=1
proj-climate-forecast: needs_review logical=844103680 physical=424673280 savings=419430400 blockers=0 reviews=1
proj-quantum-traces: blocked logical=1268776960 physical=1268776960 savings=0 blockers=2 reviews=2
Signed audit sample: proj-neuro-atlas digest=... signature=...
```

## Files

- `src/storage-dedup-ledger.js` - dependency-free storage and deduplication evaluator.
- `data/sample-storage-book.json` - synthetic project artifact inventories.
- `test/storage-dedup-ledger.test.js` - coverage for dedupe, quota, tiers, retention, and signed events.
- `docs/requirement-map.md` - issue #14 requirement mapping and non-overlap notes.
- `docs/demo.svg` and `docs/demo.gif` - short demo artifacts for review.
