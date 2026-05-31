# Priority Support Entitlement Guard

Self-contained reviewer slice for SCIBASE issue #20, Revenue Infrastructure.

This guard checks whether lab and institutional support cases are entitled to paid priority support before premium handling is granted. It focuses on the revenue stream around enterprise support, SLA windows, and paid support add-ons rather than generic billing, usage metering, renewals, cancellations, dunning, quote approval, receipt privacy, grant cost-share, sanctions, or analytics-seat licensing.

It audits:

- active premium plan and support add-on coverage
- requester support-roster and institution-admin eligibility
- unpaid invoice holds before premium handling
- requested SLA targets against account entitlement
- sensitive data support routing before engineering access
- enterprise escalation approvals
- support-minute overage billing or finance approval
- deterministic allow, hold, standard-route, and remediation decisions

The module uses synthetic data only and does not call payment providers, support desks, CRMs, tax services, identity providers, bank APIs, or external systems.

## Files

- `index.js` - support entitlement audit engine
- `sample-data.js` - synthetic account and support-case packets
- `test.js` - deterministic regression tests
- `demo.js` - generates JSON, Markdown, and SVG reviewer artifacts
- `render-video.js` - renders the required short MP4 demo
- `reports/` - generated reviewer packet

## Validation

```bash
node priority-support-entitlement-guard/test.js
node priority-support-entitlement-guard/demo.js
node priority-support-entitlement-guard/render-video.js
node --check priority-support-entitlement-guard/index.js
node --check priority-support-entitlement-guard/sample-data.js
node --check priority-support-entitlement-guard/test.js
node --check priority-support-entitlement-guard/demo.js
node --check priority-support-entitlement-guard/render-video.js
git diff --check
ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt,width,height -show_entries format=duration,size -of default=nw=1 priority-support-entitlement-guard/reports/demo.mp4
```
