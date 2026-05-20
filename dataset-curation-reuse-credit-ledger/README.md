# Dataset Curation Reuse Credit Ledger

This is a focused Community & User Reputation System slice for SCIBASE issue #15. It awards or quarantines reputation credit for downstream reuse of curated datasets and code, using citation evidence, license compatibility, self-reuse controls, duplicate evidence checks, and deterministic audit digests.

## Scope

- Allocates curator, validator, and maintainer credit from validated downstream reuse.
- Requires citation evidence before awarding public reputation.
- Checks license compatibility between source asset and reuse event.
- Quarantines self-reuse until independent evidence exists.
- Flags duplicate evidence hashes.
- Emits profile-ready reputation deltas and reuse badges.
- Emits stable `dcrcl_` audit digests for each reuse packet.

It intentionally does not duplicate broad reputation ledgers, review-quality safeguards, abuse/appeals detectors, peer-review calibration, reviewer COI assignment, contributor credit attestation, transparency receipts, correction-impact ledgers, or mentorship impact ladders.

## Run

```powershell
node dataset-curation-reuse-credit-ledger/test.js
node dataset-curation-reuse-credit-ledger/demo.js
```

The demo writes:

- `dataset-curation-reuse-credit-ledger/demo-output/reuse-credit-ledger.json`
- `dataset-curation-reuse-credit-ledger/demo-output/demo.svg`

This PR also includes the required short MP4 demo artifact:

- `dataset-curation-reuse-credit-ledger/demo-output/demo.mp4`

## API

```js
const {
  auditReuseCredits,
  buildReputationSummary,
  createReuseDigest,
} = require("./dataset-curation-reuse-credit-ledger");

const audit = auditReuseCredits({ assets, reuseEvents, generatedAt });
```
