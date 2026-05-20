# Requirements Map

Issue: SCIBASE-AI/SCIBASE.AI#13, AI-Assisted Research Tools (MVP Level)

## AI Paper Summarizer

- `buildSummaryModes` emits abstract-style, executive, and layperson summaries from an audit packet.
- Evidence spans are preserved so summaries can point reviewers back to manuscript sections.

## AI Peer Review Aid

- `screenProtocolDeviation` flags outcome switching, analysis drift, sample-size shortfall, unplanned exclusions, and missing protocol citations.
- Reviewer tasks convert each flag into an action a human editor can check before external review.

## AI Citation Tool

- Missing registry or protocol citations are detected from the manuscript reference list.
- Citation recommendations include APA and Nature formats plus insertion rationale.

## Guardrails

- Uses synthetic sample data only.
- No external APIs, credentials, uploaded manuscripts, or live corpora.
- Deterministic digest supports repeatable audit packets and reviewer comparison.
