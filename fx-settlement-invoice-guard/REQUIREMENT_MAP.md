# Requirement Map

This module is scoped to invoice-release currency rounding controls for issue #20 Revenue Infrastructure. It is intentionally narrower than broader FX settlement reconciliation work.

| Issue #20 requirement area | Covered by this module | Evidence |
| --- | --- | --- |
| Tiered subscription and institutional invoices | Validates synthetic invoice packets before release or revenue close | `examples/fx-settlement-packets.json` |
| Usage-based AI compute and top-ups | Includes compute bundle and top-up line items in multi-currency invoices | `examples/fx-settlement-packets.json` |
| Secure payment integrations | Requires processor settlement reference before revenue close | `src/index.js` |
| Monthly/annual cycles and credits | Applies credit notes and requires credit approval evidence | `src/index.js` |
| Transparent usage and finance controls | Emits deterministic release/review/hold findings with remediation | `src/index.js`, `artifacts/fx-settlement-report.md` |
| Reviewer demo evidence | Generates JSON, Markdown, SVG, and MP4 artifacts | `scripts/demo.js`, `artifacts/` |

## Explicit Non-Scope

The guard does not implement:

- provider fee caps
- remittance reference deduplication
- cross-border tax evidence
- booking ledger reconciliation
- payment processor API integration
- live FX market lookup
- bank account or customer payment data handling

Those are separate revenue infrastructure slices. This PR focuses only on whether a synthetic invoice can be released when currency minor units, FX quote freshness, processor settlement delta tolerance, credit offsets, and material variance approvals are coherent.
