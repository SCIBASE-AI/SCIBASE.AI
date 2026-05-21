# Enterprise SCIM Deprovisioning Guard

This module adds a focused SCIM/HRIS deprovisioning guard for SCIBASE issue
[#19](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/19). It helps enterprise
admins reconcile identity lifecycle events against SCIBASE roles, API tokens,
export connectors, seat licenses, compute quota, and pending publication
ownership.

The slice is intentionally narrow. It does not duplicate API change governance,
connector certification, secret rotation, compute quota governance, AI model
governance, funder reporting export, incident response, dashboard attribution,
policy exception review, IRB consent governance, initiative tags, or data export
approval queues already submitted for the same issue.

## What It Checks

- HRIS leaver or contract-ended status against SCIM active state.
- Protected enterprise roles after termination or department transfer.
- Active API tokens past the termination grace window.
- Export connector ownership for DSpace, Invenio, Zenodo, and PubMed Central.
- Enterprise seat license reclaim readiness.
- Compute quota reassignment or reclaim actions.
- Pending publication owner transfer before exports proceed.

## Local Usage

```bash
cd enterprise-scim-deprovisioning-guard
npm run check
npm test
npm run demo
```

`npm run demo` writes reviewer artifacts under `reports/`:

- `deprovisioning-review-packet.json`
- `deprovisioning-review-report.md`
- `summary.svg`
- `demo.mp4`

All examples use synthetic identity data. No HRIS, SSO, SCIM, payment, KYC, or
private account integrations are called.
