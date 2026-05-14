# Requirement Map

This module addresses SCIBASE issue #13 by implementing an evidence-first audit workflow for the AI-assisted research tools MVP.

| Issue requirement | Implementation evidence |
| --- | --- |
| AI paper summarizer | `generateSummary()` supports abstract, executive, and layperson modes. |
| Key findings, implications, and next steps | Summaries include key findings, implications, next steps, and evidence spans. |
| Domain-aware output | `buildPaperIntake()` and `extractKeywords()` profile the biology manuscript with domain terms. |
| AI peer review aid | `runPeerReviewAid()` emits structured diagnostics for statistics, compliance, claim support, and similarity. |
| Plagiarism/similarity detection | `checkSimilarity()` compares manuscript text against local open-corpus snippets and reports match scores. |
| Grammar, clarity, and tone proxy | Review issues include low-support claims and release-readiness status rather than free-form prose. |
| Statistical error detection | The peer review aid flags p-values without confidence intervals. |
| Compliance checks | The peer review aid flags missing consent statement and data availability wording. |
| Customizable domain templates | The sample manuscript carries a domain and domain-specific keyword extraction. |
| AI citation tool | `recommendCitations()` ranks candidate citations by missing topics, title overlap, and open-access status. |
| Multiple citation styles | Citation output supports APA, MLA, and Nature formatting. |
| One-click insertion | Citation recommendations include insertion plans mapped to claim IDs and missing topics. |
| Similar papers widget | Candidate recommendations include matched topics and scores for follow-up reading. |
| Hallucination guardrails | `buildHallucinationGuardrail()` blocks unsupported outputs and emits required disclosures. |
| Reviewer-ready local demo | `src/server.js`, tests, README commands, and `demo/demo-text.txt` expose reproducible local API validation. |

## Differentiation From Existing #13 PRs

Existing #13 submissions mostly implement broad summarizer, review, and citation demos. This module focuses on auditability: every summary, review diagnostic, citation recommendation, insertion plan, and guardrail decision is tied to deterministic evidence hashes so authors and reviewers can inspect why the tool produced an output.
