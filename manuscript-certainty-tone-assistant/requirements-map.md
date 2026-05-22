# Requirements Map

Issue: SCIBASE-AI/SCIBASE.AI#13, AI-Assisted Research Tools MVP.

| Requirement | Coverage |
|---|---|
| AI Peer Review Aid | `evaluatePortfolio()` and `evaluateManuscript()` produce reviewer-ready decisions for draft manuscripts. |
| Grammar, clarity, and tone analysis | `evaluateClaimCertainty()` checks overconfident terms, universal scope, causal language, and missing uncertainty language. |
| Statistical error detection | Significance wording is checked against p-values, alpha threshold, and confidence interval coverage. |
| Compliance checks | Strong claims are required to link limitation anchors and evidence spans before reviewer signoff. |
| Customizable templates | `tonePolicy` centralizes thresholds, evidence ranks, phrase lists, alpha, replication context, and sample-size limits. |
| Immediate MVP value | `npm run demo` emits JSON, Markdown, SVG, and MP4 artifacts that a reviewer can inspect without external services. |

## Non-Overlap

This module does not implement summarization, citation recommendation, citation formatting, citation context fit, manuscript similarity triage, ethics/data availability checks, unit consistency, biomethods provenance, image integrity, or broad statistical review. It calibrates wording strength against evidence strength and reviewer policy.
