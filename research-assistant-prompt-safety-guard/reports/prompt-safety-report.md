# Research Assistant Prompt Safety Guard Report

Manuscript: Hypoxic priming improves neuronal organoid recovery after ischemic stress (ms-neuro-oxygen-2026)
Status: quarantine_assistant_packet
Generated: 2026-05-21T10:00:00.000Z

## Summary

- Input injection findings: 4
- Assistant output findings reviewed: 3
- Evidence index entries: 6
- Blockers: 6
- Warnings: 1

## Blockers

- ms-neuro-oxygen-2026: possible prompt-injection instruction matched ignore-prior (ignore-prior)
- supp-hidden-reviewer-note: possible prompt-injection instruction matched system-prompt (system-prompt)
- supp-hidden-reviewer-note: hidden or visually suppressed instruction channel detected (hidden-instruction-channel)
- finding-hallucinated-citation: unknown evidence anchors: citation-phantom-2025 (unsupported-assistant-output)
- finding-hallucinated-citation: acceptance recommendation conflicts with unresolved evidence blockers (unsupported-assistant-output)
- finding-no-anchor: finding has no evidence anchors (unsupported-assistant-output)

## Warnings

- ms-neuro-oxygen-2026: possible prompt-injection instruction matched reviewer-coercion (reviewer-coercion)

## Required Actions

- ms-neuro-oxygen-2026: quarantine ms-neuro-oxygen-2026 before assistant processing
- ms-neuro-oxygen-2026: quarantine ms-neuro-oxygen-2026 before assistant processing
- supp-hidden-reviewer-note: quarantine supp-hidden-reviewer-note before assistant processing
- supp-hidden-reviewer-note: quarantine supp-hidden-reviewer-note before assistant processing
- finding-hallucinated-citation: replace hallucinated anchors with verified manuscript, artifact, or citation ids
- finding-hallucinated-citation: suppress accept/reject recommendation until blockers are resolved
- finding-no-anchor: attach at least one claim, artifact, or citation id before this review comment is shown

## Output Review Matrix

### Endpoint support is visible for ATP recovery (finding-supported-atp)
- Support score: 0.33
- Evidence ids: claim-atp-recovery, fig-2b, table-s1
- Blockers: 0
- Warnings: 0

### Claims cite a nonexistent clinical trial (finding-hallucinated-citation)
- Support score: 0
- Evidence ids: citation-phantom-2025
- Blockers: 2
- Warnings: 0

### Mechanism claim needs a source (finding-no-anchor)
- Support score: 0
- Evidence ids: none
- Blockers: 1
- Warnings: 0

