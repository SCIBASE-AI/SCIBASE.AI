# Enterprise Training Policy Guard

This module adds a focused Enterprise Tooling guard for training currency and policy acknowledgement evidence before privileged exports or project actions continue.

It evaluates synthetic institutional access packets for:

- missing required policy acknowledgements
- stale policy acknowledgements older than 180 days
- missing role-specific training modules
- expired training certificates
- missing receipt IDs for completed training

The output is deterministic and reviewer-ready: `release`, `revise`, or `hold`, plus remediation text for each finding.

## Run

```bash
npm test
npm run demo
npm run demo:video
```

Generated artifacts are written to `reports/`.

## Safety

The sample packets are synthetic. The module does not call external services and does not use credentials, private research records, payment systems, wallets, live SSO/SCIM systems, or production exports.
