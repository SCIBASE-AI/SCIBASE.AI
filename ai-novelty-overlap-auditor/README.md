# AI Novelty Overlap Auditor

This module is a focused slice for SCIBASE.AI issue #13, AI-Assisted Research Tools (MVP Level).

It checks AI-generated manuscript novelty language against a synthetic adjacent-literature packet before a draft reaches peer review. The goal is to prevent the assistant from overstating novelty, missing closely related citations, or relying on retracted/stale sources.

## What It Covers

- Paper summarizer: emits abstract-style, executive, and layperson summaries of the novelty audit.
- AI peer review aid: flags absolute novelty language, uncited adjacent work, and retracted-source risk.
- AI citation tool: recommends insertion of adjacent-work citations with DOI/source metadata.
- Reviewer-safe rewrite: turns broad novelty claims into scoped, evidence-grounded language.
- Deterministic audit digest: hashes the review packet for reproducibility.

## Run

```bash
node ai-novelty-overlap-auditor/test.js
node ai-novelty-overlap-auditor/demo.js
```

Demo output is written to:

- `reports/audit.json`
- `reports/novelty-overlap.svg`
- `reports/review-packet.md`
- `reports/demo.mp4`

The sample data is synthetic and dependency-free.
