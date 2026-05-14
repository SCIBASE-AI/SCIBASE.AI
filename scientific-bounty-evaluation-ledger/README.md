# Scientific Bounty Evaluation Ledger

This module adds a focused MVP for the scientific bounty system requested in issue #18. It does not try to own every bounty workflow. Instead, it creates a deterministic evaluation ledger that can sit behind SCIBASE challenge pages and help reviewers decide whether a scientific submission is ready for award, revision, arbitration, or rejection.

## Capabilities

- Define challenge rubrics with weighted criteria and milestone budgets.
- Validate submission evidence manifests for repository links, reproducibility notes, demo assets, data/code artifacts, and IP terms.
- Detect reviewer conflicts by institution, author overlap, and declared relationships.
- Score submissions across reviewers with weighted rubric aggregation.
- Produce milestone award recommendations with revision gates and arbitration triggers.
- Generate IP-safe acceptance records that avoid transferring rights until the award decision is explicit.
- Produce payout readiness reports for finance or Algora-style reward routing.

## Quick Start

```bash
cd scientific-bounty-evaluation-ledger
npm test
npm run demo
```

## Example

```js
import { evaluateBountySubmission } from "./src/evaluation-ledger.js";
import { challenge, submission, reviews } from "./src/sample-ledger.js";

const report = evaluateBountySubmission(challenge, submission, reviews);
console.log(report.decision.status);
console.log(report.payout.ready);
```

The implementation is dependency-free and deterministic so reviewers can verify it without credentials, blockchain access, payment processors, or paid APIs.
