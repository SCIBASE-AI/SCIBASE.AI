# Enterprise AI Model Governance Gate

This is a focused Enterprise Tooling slice for issue #19.

It gives an institution a simple admin-side gate for AI model requests. Before a lab connects a model to SCIBASE workflows, the gate checks model approval, data boundary, retention, vendor DPA status, token budget, blocked integrations, and missing internal approvals.

The module is dependency-free and uses synthetic data only.

## Run

```bash
node enterprise-ai-model-governance-gate/test.js
node enterprise-ai-model-governance-gate/demo.js
```

The demo writes:

- `enterprise-ai-model-governance-gate/demo-output/governance-packet.json`
- `enterprise-ai-model-governance-gate/demo-output/demo.svg`
- `enterprise-ai-model-governance-gate/demo-output/demo.mp4`

## Why This Fits Enterprise Tooling

Institutional admins need to know which AI tools can touch which research data. This gate keeps that decision auditable:

- approved requests get allowed scopes
- risky requests go to an admin queue
- missing IRB, privacy, legal, or registrar approvals are listed
- webhook events can notify enterprise systems
- the audit digest lets reviewers compare before/after packets

No real user data, model calls, credentials, or external systems are used here.
