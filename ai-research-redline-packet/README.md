# AI Research Redline Packet

This module adds a focused AI-assisted research-tool slice for SCIBASE. It does
not try to be another broad paper summarizer or generic citation formatter.
Instead, it produces an evidence-backed pre-submission redline packet that tells
researchers what must be fixed before sharing a manuscript.

The workflow is deterministic and dependency-free, making it suitable for local
review checks, future API handlers, or reviewer-facing demo artifacts.

## What It Covers

- Generates abstract, executive, and layperson summary deltas from a structured
  manuscript sample.
- Maps manuscript claims to evidence spans and flags unsupported claims.
- Detects statistical redlines such as missing confidence intervals and
  inconsistent p-value language.
- Checks compliance items such as ethics statements and data availability.
- Ranks citation gap recommendations with transparent reasons.
- Routes issues to reviewer templates and creates insertion-ready revision
  tasks.
- Includes tests, synthetic sample data, a CLI demo, requirement mapping, and a
  short demo video.

## Quick Start

```bash
npm run check
npm test
npm run demo
```

Expected demo summary:

```text
Packet decision: revise-before-submit
Redlines: 5
Revision tasks: 5
Citation recommendations: 3
```

## Repository Layout

```text
ai-research-redline-packet/
  data/sample-manuscript.json
  docs/demo.svg
  docs/demo.mp4
  docs/requirement-map.md
  scripts/demo.js
  src/redline-packet.js
  test/redline-packet.test.js
```

## Design Notes

The redline packet sits between AI summarization, AI peer review, and AI
citation assistance:

1. A manuscript is parsed into claims, evidence spans, results, compliance
   statements, and citations.
2. Summary modes are generated from the same evidence inventory.
3. Unsupported claims, statistical issues, compliance gaps, and citation gaps
   become reviewer-facing redlines.
4. Redlines are converted into concrete revision tasks with insertion targets.
5. The final packet has an audit digest so reviewers can reproduce the decision.

This gives researchers an actionable pre-review artifact rather than a loose AI
chat transcript.
