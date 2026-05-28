# Challenge Data-Use Agreement Guard

Standalone reviewer artifact for SCIBASE issue #18.

This slice validates controlled scientific bounty materials before sponsor
review, payout release, or IP handoff. It checks active data-use agreements,
permitted-use alignment, export-control clearance, retention duties, derived
artifact release scope, and sponsor packet redaction.

## Validation

```bash
node challenge-data-use-agreement-guard/test.js
node --check challenge-data-use-agreement-guard/index.js
node --check challenge-data-use-agreement-guard/demo.js
node challenge-data-use-agreement-guard/demo.js
python challenge-data-use-agreement-guard/make-demo-video.py
```

All data is synthetic. The module does not call external services and does not
contain credentials, private research data, real participants, or payment data.
