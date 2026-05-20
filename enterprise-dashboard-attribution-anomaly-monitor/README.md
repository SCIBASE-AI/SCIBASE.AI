# Enterprise Dashboard Attribution Anomaly Monitor

This module is a focused Enterprise Tooling slice for SCIBASE issue #19. It protects organization-wide admin dashboards from distorted productivity, collaboration, and ROI metrics before institutional leaders use those metrics for compliance or funding decisions.

## What It Adds

- Canonical researcher attribution across linked identities such as ORCID and GitHub accounts.
- Service-account activity separation so automation does not inflate researcher productivity.
- Private-project visibility boundary checks for institution-level admins.
- Usage-spike, duplicate-identity, service-credit, private-boundary, and cross-lab collaboration-inflation anomaly detection.
- Researcher and lab credit summaries for executive dashboards.
- Reviewer packets, JSON output, and SVG preview for admin review.

## Why This Is Distinct

Existing #19 submissions cover exports, webhooks, compliance evidence, identity provisioning, retention, data residency, SLA, lab inventory, secret rotation, quotas, API changes, connector certification, incident response, funder reporting, and AI model governance. This slice focuses specifically on admin dashboard attribution quality and metric integrity.

## Run

```bash
node enterprise-dashboard-attribution-anomaly-monitor/test.js
node enterprise-dashboard-attribution-anomaly-monitor/demo.js
```

The demo writes:

- `enterprise-dashboard-attribution-anomaly-monitor/dashboard-attribution-report.json`
- `enterprise-dashboard-attribution-anomaly-monitor/reviewer-packet.md`
- `enterprise-dashboard-attribution-anomaly-monitor/demo.svg`

## Decision Policy

High-severity attribution anomalies hold the executive dashboard until resolved. Medium anomalies remain visible only with dashboard annotations and owner confirmation requests.
