# Enterprise Initiative Tag Governance

Self-contained Enterprise Tooling slice for SCIBASE issue #19.

This module validates institution-defined initiative tags such as `GRANT-TRACKED`, `DOCTORAL-WORK`, or `PUBLIC-INITIATIVE` before they appear in admin dashboards, analytics rollups, or outbound webhook events.

## What It Covers

- Controlled initiative tag vocabularies for institutional admins.
- Scope checks by department, lab, or organization.
- Owner approval, expiry, funder linkage, required evidence, and reproducibility thresholds.
- Private or restricted project boundary checks before dashboard publishing.
- Mutual exclusion checks for conflicting internal and public tags.
- Dashboard rollups by tag and department.
- Signed webhook-ready governance events and a deterministic audit digest.

## Local Validation

```bash
node enterprise-initiative-tag-governance/test.js
node enterprise-initiative-tag-governance/demo.js
node --check enterprise-initiative-tag-governance/index.js
node --check enterprise-initiative-tag-governance/test.js
node --check enterprise-initiative-tag-governance/demo.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 enterprise-initiative-tag-governance/demo.mp4
```

The demo writes:

- `enterprise-initiative-tag-governance/reports/reviewer-packet.json`
- `enterprise-initiative-tag-governance/demo.svg`
- `enterprise-initiative-tag-governance/demo.mp4` is included as the short demo artifact.
