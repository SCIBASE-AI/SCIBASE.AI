# Assistant Decision Handoff Guard

This module adds a focused assistant decision handoff guard for the
AI-Powered Research Assistant Suite bounty. It checks whether outputs from
peer-review, reproducibility, and research-gap assistants are safe to turn into
researcher-facing recommendations or tasks.

## Scope

The guard evaluates synthetic assistant handoff packets for:

- source snapshot freshness before recommendations are released
- artifact revision drift between the assistant context and current project
- cross-assistant conflicts from peer-review, reproducibility, and gap engines
- evidence anchors required by handoff type
- high-impact action authority and human approval state
- private reviewer note or identity leakage before user-facing release
- confidence and remediation coverage for actionability
- deterministic release, revise, or hold decisions with audit digests

This is not another peer-review generator, reproducibility score, research-gap
finder, evidence binder, prompt-safety filter, structured abstract checker, or
external-validity assistant. It is the handoff boundary that decides whether
existing assistant outputs can safely become user-visible actions.

## Issue #16 Requirement Mapping

- Auto peer review reports: blocks private-note leakage, stale manuscript
  context, unsupported reviewer-facing actions, and missing evidence anchors.
- Reproducibility checker: prevents badge or release handoffs when run logs,
  environment locks, result digests, or human approvals are incomplete.
- Research gap finder: checks corpus freshness, novelty evidence, limitation
  signals, and confidence before opportunities become researcher tasks.
- Suite orchestration: reconciles conflicts between assistant outputs before a
  unified action is shown to the researcher.

## Validation

```bash
node assistant-decision-handoff-guard/test.js
node assistant-decision-handoff-guard/demo.js
node assistant-decision-handoff-guard/render-video.js
node --check assistant-decision-handoff-guard/index.js
node --check assistant-decision-handoff-guard/sample-data.js
node --check assistant-decision-handoff-guard/test.js
node --check assistant-decision-handoff-guard/demo.js
node --check assistant-decision-handoff-guard/render-video.js
git diff --check
```
