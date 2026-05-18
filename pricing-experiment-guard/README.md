# Pricing Experiment Guard

This self-contained revenue infrastructure module checks whether pricing and packaging experiments are safe to launch. It is designed for finance, growth, and product teams that need audit-ready controls before changing SaaS prices, entitlements, or AI-compute bundles.

## What It Checks

- A measurable hypothesis and unchanged control cohort
- Gross-margin headroom against a finance-approved floor
- Entitlement removals without grandfathering
- Variant exposure limits and rollback readiness
- Invoice copy review, customer notice windows, and tax review
- Finance/legal approvals and revenue-recognition notes

## Run It

```bash
node pricing-experiment-guard/test.js
node pricing-experiment-guard/demo.js
```

The module uses only Node.js standard library APIs.

## Public API

```js
const { evaluatePricingExperiment } = require("./index.js");

const result = evaluatePricingExperiment(experiment);
console.log(result.summary.launchDecision);
console.log(result.findings);
console.log(result.financePacket.requiredActions);
```

The guard returns a launch decision of `approve`, `needs-remediation`, or `block`, plus finance-owner remediation steps and audit questions.

## Demo

The included `demo.gif` shows a risky enterprise AI-compute price lift being blocked because it lacks a hypothesis/control, breaches margin floors, removes entitlements, exceeds rollout limits, and has incomplete billing/audit controls.
