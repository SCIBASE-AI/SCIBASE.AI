# Acceptance Notes

## Scope

This PR adds a self-contained governance gate for research involving human participants or consent-limited data. It can be reviewed without external accounts, third-party APIs, or credentials.

## Reviewer workflow

1. Run `node enterprise-irb-consent-governance/test.js`.
2. Run `node enterprise-irb-consent-governance/demo.js`.
3. Inspect `irb-consent-report.json`, `reviewer-packet.md`, `demo.svg`, and `demo.mp4`.

## Safety boundaries

- Uses synthetic sample data only.
- Does not store or request credentials.
- Does not call external services.
- Webhook signatures use a synthetic secret from `sample-data.js`.
- Export decisions are deterministic and auditable through `auditDigest` and per-project `evidenceDigest` fields.
