# Clinical Trial Registry Graph Guard

This module is a dependency-free, synthetic-data-only guard for SCIBASE
Scientific Knowledge Graph Integration. It validates clinical trial registry
evidence before trial nodes, outcome edges, dataset links, protocol links, or
clinical recommendations are surfaced in discovery views.

## What It Checks

- Normalizes registry identifiers for NCT, EUCTR, and ISRCTN records.
- Flags invalid or stale registry snapshots.
- Holds completed trials when primary-completion dates are old and
  results-posting evidence is missing.
- Suppresses recommendation edges for withdrawn, suspended, or terminated
  trials.
- Requires registered protocol links for higher-phase interventional trials.
- Validates publication, dataset, and protocol graph edges against the canonical
  trial registry ID.
- Flags publication endpoint claims that are not declared in the registered
  trial endpoints.

## Local Commands

```bash
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts under `reports/`:

- `clinical-trial-registry-packet.json`
- `clinical-trial-registry-report.md`
- `summary.svg`
- `demo.mp4`

## Requirements Map

| Issue #17 requirement | Coverage in this slice |
| --- | --- |
| Scientific knowledge graph entity quality | Canonical trial registry nodes for NCT, EUCTR, and ISRCTN IDs. |
| Evidence-backed relationships | Publication, dataset, protocol, and recommendation edges are checked against registry evidence. |
| Graph navigation and recommendations | Unsafe clinical recommendations are suppressed before display. |
| Research discovery safety | Withdrawn trials, overdue results, stale registry evidence, and endpoint mismatches produce curator actions. |
| API/demo readiness | `evaluateGraph()` returns deterministic reviewer packets and `demo.js` generates JSON, Markdown, SVG, and MP4 artifacts. |

## Safety Boundaries

- Uses only synthetic fixtures in `sample-data.js`.
- Does not call ClinicalTrials.gov, EUCTR, ISRCTN, journal APIs, repositories,
  or external services.
- Does not include real patient data, participant identifiers, credentials, or
  private institutional metadata.
