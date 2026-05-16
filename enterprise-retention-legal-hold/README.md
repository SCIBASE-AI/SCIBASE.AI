# Enterprise Retention and Legal Hold Controls

This module adds a self-contained Enterprise Tooling slice for institutional retention governance. It helps research offices decide which project records can be purged, which records must be preserved under legal hold, which exports should be locked, and which departments need dashboard-visible action.

## What it does

- Evaluates synthetic project records against institution-level retention policies.
- Applies active legal holds by project, funder tag, or record id.
- Blocks purges and outbound exports when a hold or controlled-data rule applies.
- Builds reviewer-ready action queues for missing policies, expiring records, open-access evidence gaps, and overdue retention windows.
- Produces deterministic webhook envelopes with SHA-256 digests for downstream enterprise systems.
- Reports dashboard metrics by department, severity, data class, and action owner.

## Local usage

```bash
npm run check
npm test
npm run demo
```

The demo uses only the synthetic data in `sample-data.json`.

## Files

- `src/retention-legal-hold.js`: core evaluator and exportable helpers.
- `sample-data.json`: synthetic institution, policy, project, record, and legal hold data.
- `test.js`: dependency-free Node assertions.
- `demo.js`: terminal demo for reviewers.
- `docs/requirement-map.md`: maps this slice to the Enterprise Tooling bounty.
- `docs/demo.svg` and `docs/demo.mp4`: short visual demo artifacts.
