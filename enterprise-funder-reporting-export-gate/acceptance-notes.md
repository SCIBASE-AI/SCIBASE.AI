# Acceptance Notes

This PR addresses issue 19 with a distinct Enterprise Tooling slice: an enterprise funder reporting export gate.

## Scope

- It does not duplicate previous dashboard, incident response, secret rotation, quota, connector certification, or API change submissions.
- It focuses on funder and repository export readiness for institutional admins.
- It stays self-contained, credential-free, and synthetic-data-only.

## Verification

```bash
node enterprise-funder-reporting-export-gate/test.js
node enterprise-funder-reporting-export-gate/demo.js
git diff --check
```

## Acceptance Checklist

- Admin-ready portfolio metrics are produced.
- Funder mandate and open-access compliance are evaluated.
- Reproducibility score gates can block export.
- Export destination routing is funder-aware.
- Artifact hashes and licenses are preserved in export packets.
- Webhook-ready governance events are deterministically signed.
