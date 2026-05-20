# Requirements Map

Issue #13 asks for MVP-level AI-assisted research tools. This slice addresses the parts most tied to reviewer trust.

## AI Paper Summarizer

- Abstract-style summary: `summaryModes.abstract`
- Executive summary: `summaryModes.executive`
- Layperson explanation: `summaryModes.layperson`
- Key findings and next steps: `findings[]` and `summaryEvidence[]`
- Domain-aware output: evidence artifacts carry tags, units, and captions that guide review actions

## AI Peer Review Aid

- Diagnostic report: `findings[]`
- Statistical error detection: p-value claims without confidence interval context are flagged
- Compliance-style checks: missing figure/table references, unused artifacts, weak captions, and unclear units are flagged
- Custom review packets: findings include severity, code, sentence/artifact, and author action

## AI Citation Tool

- Citation recommendations: `citationActions[]`
- Context-aware matching: citation keywords are checked against figure/table tags and captions
- Insert/defer actions: every candidate citation receives a reviewer-facing recommendation and reason

## Reviewer Evidence

- `test.js` verifies parsing, risk scoring, missing evidence, citation decisions, and clean-draft readiness
- `demo.js` writes JSON and SVG artifacts for quick review
- `auditDigest` creates deterministic packet IDs for before/after review comparison
