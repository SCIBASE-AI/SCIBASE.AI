# Negative Evidence Replication Graph

This module is a focused Scientific Knowledge Graph Integration slice for SCIBASE issue #17. It treats failed replications, null results, and inconclusive studies as first-class graph signals instead of leaving them as unstructured notes attached to a paper.

## What It Adds

- Typed graph nodes for claims, concepts, methods, datasets, protocols, papers, and replication signals.
- Deterministic scoring for positive support and negative replication pressure.
- Recommendation treatments that promote replicated claims, show uncertain claims with caution, or suppress recommendations when failed replication evidence is strong.
- Entity-page packets with schema.org-compatible JSON-LD and reviewer-visible replication actions.
- Publication-bias alerts when a domain has confident claims but no registered negative-result records.
- Offline JSON and SVG demo output generated from synthetic data.

## Why This Is Distinct

Existing submissions for #17 cover broad extraction/navigation, link audits, ontology drift, conflict arbitration, author disambiguation, artifact reuse lineage, evidence freshness, reproducibility routes, and visibility filtering. This slice focuses specifically on negative evidence: failed replication attempts, null results, and inconclusive runs that should change graph navigation and AI recommendations before researchers rely on a claim.

## Run

```bash
node negative-evidence-replication-graph/test.js
node negative-evidence-replication-graph/demo.js
```

The demo writes:

- `negative-evidence-replication-graph/demo-output.json`
- `negative-evidence-replication-graph/demo.svg`

## Core Policy

When negative replication pressure is high, the module returns `suppress_recommendation` and requires curator review plus a visible entity-page replication note. When evidence is inconclusive, the module keeps the claim discoverable but requires method detail before it is promoted in recommendation digests.
