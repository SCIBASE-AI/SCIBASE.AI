# Causal Claim Validity Guard

This module adds a focused causal-claim review gate for the AI-Powered Research Assistant Suite in issue `#16`.

Scientific manuscripts often drift from careful associational language into causal conclusions. The guard inspects synthetic review packets and determines whether AI-generated peer-review output should be released, revised, or held until the causal claim is supported.

## Scope

- Detects causal-language overreach in manuscript claims and conclusions.
- Checks whether the study design can support causal language.
- Flags missing comparator/control support, temporal-order gaps, confounder handling gaps, and effect-size uncertainty.
- Produces evidence-linked remediation items suitable for authors, internal reviewers, or automated pre-submission checks.
- Uses synthetic data only.
- Uses no external AI APIs, credentials, private manuscripts, payment systems, or network calls.

## Requirement Map

| Issue #16 capability | Implementation |
| --- | --- |
| Auto peer review reports | Emits structured reviewer findings, severity, decision, and remediation. |
| Methodological red flags | Detects design/evidence mismatch, missing controls, confounder gaps, and uncertainty gaps. |
| Claims vs evidence alignment | Compares claim intent, causal wording, study design, temporal evidence, and comparator evidence. |
| Adaptive templates per domain | Supports packet-level `domain` and domain-specific reviewer note generation. |
| Reproducible deterministic output | Demo and tests use fixed synthetic packets and deterministic scoring. |

## Run

```bash
npm test
npm run demo
npm run check
```

Demo artifacts are written to `artifacts/`:

- `causal-claim-review.json`
- `causal-claim-review.md`
- `causal-claim-summary.svg`

## Decisions

- `RELEASE`: evidence supports the causal wording.
- `REVISE`: the manuscript can likely be repaired with clearer language or additional evidence.
- `HOLD`: the causal claim is not safe to release without material methodological support.

## AI Assistance Disclosure

Implemented with Codex assistance and locally verified with deterministic tests and generated artifacts.
