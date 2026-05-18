# Benchmark Leakage Audit Assistant

This self-contained module adds an AI research assistant slice for pre-release benchmark hygiene. It helps reviewers catch evaluation leakage before a paper, model, or scientific benchmark result is published.

## What It Checks

- Train/test overlap by record ID or normalized content fingerprint
- Benchmark contamination in the training corpus
- Final holdout or test set use during model selection
- Missing split provenance such as deterministic method, seed, or manifest hash
- Missing reproducibility packet evidence such as lockfiles, manifests, code archive, and preregistration

## Run It

```bash
node benchmark-leakage-audit-assistant/test.js
node benchmark-leakage-audit-assistant/demo.js
```

The module uses only Node.js standard library APIs.

## Public API

```js
const { auditBenchmarkLeakage } = require("./index.js");

const audit = auditBenchmarkLeakage(project);
console.log(audit.summary.releaseDecision);
console.log(audit.findings);
console.log(audit.reviewerPacket.tasks);
```

The audit returns a release decision of `pass`, `needs-remediation`, or `block`, plus reviewer-ready findings with evidence and remediation tasks.

## Demo

The included `demo.gif` shows the module blocking a release candidate with train/test overlap, benchmark contamination, held-out tuning, weak split provenance, and missing reproducibility artifacts.
