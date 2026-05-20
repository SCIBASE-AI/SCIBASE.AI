# Project Access Audit Anomaly Monitor

This module is a focused User & Project Management slice for SCIBASE issue #11. It turns project audit logs into deterministic reviewer packets that flag suspicious access patterns before restricted datasets, notebooks, or exports leak outside the intended project boundary.

## What It Adds

- Audit-event scoring for restricted downloads, bulk downloads, data exports, role changes, external invites, API token creation, visibility changes, and object-level permission drift.
- Identity posture checks for MFA, SAML, ORCID, inactive users, and stale external collaborator access windows.
- Object-level permission checks for restricted or embargoed data, download role requirements, restricted licenses, and bulk thresholds.
- Burst detection for rapid role changes or sensitive-download clusters.
- Project-level reviewer packets with owner queues, export-hold decisions, severity counts, JSON output, Markdown output, and SVG preview.

## Why This Is Distinct

Existing #11 submissions cover broad RBAC/workspace ledgers, privacy access reviews, member lifecycle/offboarding, institutional recertification, anonymous review escrow, identity merge/export, data-room consent, researcher profile sync, and project archive handoff. This slice focuses specifically on the project audit log and detects anomalous access behavior after permissions exist.

## Run

```bash
node project-access-audit-anomaly-monitor/test.js
node project-access-audit-anomaly-monitor/demo.js
```

The demo writes:

- `project-access-audit-anomaly-monitor/audit-report.json`
- `project-access-audit-anomaly-monitor/reviewer-packet.md`
- `project-access-audit-anomaly-monitor/demo.svg`

## Decision Policy

Critical events freeze access and open a security review. High events require owner approval before the next sensitive download. Medium events enter the admin queue, while low events are retained for the audit trail.
