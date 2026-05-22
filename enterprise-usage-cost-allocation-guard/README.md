# Enterprise Usage Cost Allocation Guard

This module provides a focused Enterprise Tooling slice for SCIBASE issue #19.
It reconciles synthetic storage, compute, submission, and AI-review usage against
lab cost centers, grants, owner sponsorship, funding windows, and private-project
visibility rules before those costs are published to institutional dashboards or
grant chargeback exports.

## What It Covers

- Enterprise admin dashboard usage allocation readiness.
- Grant and cost-center chargeback validation.
- Hold decisions for missing evidence, unknown ownership, and out-of-window spend.
- Reallocation decisions for disallowed cost centers or usage types.
- Private-project review decisions that suppress sensitive project titles.
- Deterministic audit digests and reviewer packets.

## Run

```bash
npm run check
npm test
npm run demo
```

Generated artifacts are written to `reports/`:

- `summary.json`
- `reviewer-packet.md`
- `summary.svg`
- `demo.mp4`

The data is synthetic and does not contact live billing, grant, identity, or
provider systems.
