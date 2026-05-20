# Figure/Table Evidence Auditor

This is a focused MVP slice for issue #13, "AI-Assisted Research Tools".

It checks whether manuscript claims, figures, tables, and citation recommendations line up before a human reviewer sees the draft. The goal is to catch the practical review failures that broad summarizers often miss: missing figure references, thin captions, unsupported comparative claims, p-values without uncertainty context, unused artifacts, and citations that do not match the evidence packet.

## What It Covers

- Paper summarizer: emits abstract, executive, and layperson summaries grounded in the checked evidence packet.
- Peer review aid: produces high/medium/low findings with concrete author actions.
- Citation tool: recommends whether candidate citations should be inserted or deferred based on figure/table tags and captions.
- Audit trail: returns a deterministic digest so review packets can be compared across runs.

The module is dependency-free and uses synthetic manuscript data only.

## Run

```bash
node figure-table-evidence-auditor/test.js
node figure-table-evidence-auditor/demo.js
```

The demo writes:

- `figure-table-evidence-auditor/demo-output/audit-packets.json`
- `figure-table-evidence-auditor/demo-output/demo.svg`
- `figure-table-evidence-auditor/demo-output/demo.mp4`

## Review Notes

The implementation is intentionally deterministic. It is not trying to replace an LLM; it provides the evidence guardrails an AI writing assistant should satisfy before showing a summary, reviewer checklist, or citation insertion to researchers.

This keeps the MVP useful without requiring API keys, live corpora, or uploaded PDFs during review.
