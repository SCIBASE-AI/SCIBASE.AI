# Protocol Deviation Screener

Dependency-free reviewer aid for the AI-Assisted Research Tools MVP.

This module compares a registered protocol or preregistration packet against a manuscript packet and returns a deterministic audit for:

- primary outcome switching
- unregistered primary endpoints
- analysis plan drift
- sample-size shortfalls
- post-randomization exclusions
- missing protocol or registry citations

The goal is not to replace human peer review. It gives reviewers a narrow, evidence-backed checklist before a manuscript enters full review.

## Files

- `index.js` - deterministic screening logic
- `sample-data.js` - synthetic protocol and manuscript packets
- `test.js` - Node assertion tests
- `demo.js` - creates demo JSON and SVG artifacts
- `demo-output/` - generated audit packet and visual demo files
- `requirements-map.md` - issue #13 acceptance mapping
- `acceptance-notes.md` - validation notes

## Usage

```bash
node protocol-deviation-screener/test.js
node protocol-deviation-screener/demo.js
```

## Example

```js
const { screenProtocolDeviation } = require("./index")
const audit = screenProtocolDeviation(protocol, manuscript)
```

The returned audit includes `readyForReview`, `riskScore`, structured flags, reviewer tasks, citation recommendations, and summary modes for reviewer-facing packets.
