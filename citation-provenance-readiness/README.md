# Citation Provenance Readiness

This module is a focused slice for SCIBASE issue `#13`, AI-Assisted Research Tools.

It does not call external AI services or citation APIs. Instead, it gives reviewers a deterministic readiness gate for manuscript claims before a paper leaves the workspace:

- extracts evidence-backed summary modes for a manuscript packet
- checks whether research claims have citation keys, bibliography records, and local evidence artifacts
- flags citation, statistics, and compliance gaps
- ranks candidate citations with transparent overlap, DOI, recency, and open-access signals
- emits APA and Nature-style insertion plans for reviewer action
- produces a stable digest for audit packets

## Local Verification

```bash
cd citation-provenance-readiness
npm run check
npm test
npm run demo
npm run render-demo
```

The demo is based on synthetic sample data in `examples/project.json`.

## Demo Output

```text
Project: Protocol-Guided Perturbation Screening
Status: hold
Readiness score: 22
Claims reviewed: 3
Missing bibliography keys: missing2026
Top citation insertion: nguyen2025
Top reviewer action: Add at least one source-backed citation or mark the claim as internal preliminary evidence.
```

## Why This Slice Is Distinct

Existing issue `#13` submissions mostly cover broad AI summarizer, peer-review, and citation demos. This module targets the provenance boundary: whether a concrete manuscript packet has traceable sources, evidence artifacts, statistical context, citation insertions, and compliance statements before an AI-assisted research tool recommends release.

The implementation is dependency-free, credential-free, and uses synthetic data only.
