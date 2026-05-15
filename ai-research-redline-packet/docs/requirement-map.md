# Requirement Map

Issue: SCIBASE-AI/SCIBASE.AI#13, AI-Assisted Research Tools (MVP Level).

## AI Paper Summarizer

The packet emits abstract, executive, and layperson summary modes from the same
structured manuscript evidence. It also reports summary deltas such as how many
key findings, reproducibility claims, and broad claims require review.

## AI Peer Review Aid

The redline engine flags unsupported claims, statistical reporting issues,
missing confidence intervals, ethics protocol gaps, and missing disclosure
statements. Each redline carries severity, insertion target, and evidence digest
so reviewers can audit why it was raised.

## AI Citation Tool

Citation recommendations are ranked against the redlines they would help fix.
The output includes transparent reasons and claim ids, making citations
insertion-ready rather than opaque suggestions.

## Review Templates

The packet routes redlines to domain-specific reviewer templates such as biology
pre-submission review and statistical methods review. This maps AI findings into
review workflows that institutions can standardize.

## Actionable Output

Every redline becomes a revision task with an insertion target and action text.
This supports one-click manuscript editing or PR-like review queues in a future
SCIBASE interface.

## Scope Boundary

This is not another generic summarizer or chatbot transcript. It is a
deterministic pre-submission redline packet that ties summaries, peer-review
diagnostics, citation recommendations, and revision tasks together.
