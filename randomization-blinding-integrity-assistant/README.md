# Randomization Blinding Integrity Assistant

Self-contained reviewer assistant slice for SCIBASE issue #16.

It evaluates synthetic clinical and preclinical study packets before AI peer-review output is shown. The guard checks randomization sequence evidence, allocation concealment, arm balance, stratification balance, blinding role coverage, arm-label leakage, early unblinding, and post-randomization exclusions.

## Files

- `index.js` - dependency-free evaluator and Markdown reviewer packet builder
- `sample-data.js` - synthetic study packets
- `test.js` - Node test coverage for hold, author-response, imbalance, and approved paths
- `demo.js` - writes JSON, Markdown, and SVG reviewer artifacts under `reports/`
- `render-video.js` - creates a short MP4 demo artifact

## Validation

```bash
npm run check
npm test
npm run demo
npm run video
```

Synthetic data only. No private manuscripts, patient records, credentials, external APIs, model calls, network calls, payment data, or payout details are used.
