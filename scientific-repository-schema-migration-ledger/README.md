# Scientific Repository Schema Migration Ledger

Scientific project repositories need controlled metadata migrations as repository schemas evolve. This module evaluates `metadata.json` migration readiness, citation continuity, fork attribution, semantic version impact, rollback planning, and signed migration attestations.

## What It Covers

- Versioned `metadata.json` migrations from legacy/current schemas to a target SCIBASE metadata schema.
- DOI, citation, ORCID, funding, schema.org, and deprecated-field checks.
- Component hash comparison for metadata, manuscripts, data, code, notebooks, results, and protocols.
- Fork attribution checks so downstream derivations preserve provenance.
- Semantic-version impact and rollback plans for repository releases.
- Synthetic sample data only; no credentials or real repository records.

## Run It

```bash
npm run check
npm test
npm run demo
```

## Demo Output

```text
Scientific repository schema migration demo targeting scibase.repository.metadata.v2
As of 2026-05-16: 1 ready, 1 needs review, 1 blocked
Semantic impact: 2 major, 1 minor, 0 patch
repo-neuro-atlas: blocked 1.4.2->2.0.0 impact=major blockers=2 reviews=4
repo-climate-model: ready 1.2.0->1.3.0 impact=minor blockers=0 reviews=0
repo-quantum-traces: needs_review 0.9.0->1.0.0 impact=major blockers=0 reviews=2
Signed attestation sample: repo-neuro-atlas digest=... signature=...
```

## Files

- `src/schema-migration-ledger.js` - dependency-free migration evaluator and signing helpers.
- `data/sample-repository-migrations.json` - synthetic repository migration examples.
- `test/schema-migration-ledger.test.js` - coverage for decisions, semantic impact, rollback, and attestations.
- `docs/requirement-map.md` - issue #10 requirement mapping and non-overlap notes.
- `docs/demo.svg` and `docs/demo.gif` - short demo artifacts for review.
