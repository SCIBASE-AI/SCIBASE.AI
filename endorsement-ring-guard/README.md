# Endorsement Ring Guard

This module covers a narrow reputation scoring slice of SCIBASE issue #15.

It evaluates endorsement events before they update public reputation scores, holding suspicious endorsements for review when they show reciprocal-ring, self-endorsement, same-institution concentration, missing-evidence, or invalid-weight risk.

## What It Does

- Accepts synthetic users, evidence records, and endorsement events.
- Blocks invalid endorsement weights.
- Holds self-endorsements and reciprocal endorsement pairs.
- Holds endorsements that lack accepted evidence.
- Detects concentrated endorsement clusters from one institution.
- Emits reputation deltas only for accepted endorsements.
- Produces reviewer actions and a deterministic audit digest.

## Run

```bash
node endorsement-ring-guard/test.js
node endorsement-ring-guard/demo.js
```
