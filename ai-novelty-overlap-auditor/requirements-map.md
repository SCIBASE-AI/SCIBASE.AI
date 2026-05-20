# Requirements Map

Source: SCIBASE.AI issue #13, AI-Assisted Research Tools (MVP Level).

| Requirement | Implementation |
| --- | --- |
| Generate summaries of project repositories, preprints, or uploaded PDFs | `summarizeAudit()` emits abstract-style, executive, and layperson summaries for the audited synthetic manuscript packet. |
| Auto-generate key findings, implications, and next steps | `auditNoveltyOverlap()` produces `releaseDecision`, `reviewerTasks`, and reviewer-safe claim rewrites. |
| AI peer review diagnostic report | Claim audits flag novelty overstatement, uncited adjacent work, and retracted-source warnings. |
| Compliance-style checks before sharing | The release decision becomes `revise-before-release` or `hold-for-review` when risk is present. |
| Citation recommendations based on document content | `citationInsertions` recommends adjacent works from overlap scoring and includes DOI/source metadata. |
| Similar papers / further reading | `topMatches` ranks adjacent works per claim by lexical, topic, method, and finding overlap. |
| Domain-aware output | Synthetic computational-biology manuscript and adjacent CRISPR/federated-omics literature are included in `sample-data.js`. |
| Reviewer-ready evidence | `reports/audit.json`, `reports/review-packet.md`, and `reports/novelty-overlap.svg` provide deterministic audit artifacts. |
| Local verification | `test.js` covers tokenization, overlap scoring, novelty-language detection, summaries, citation recommendations, rewrite behavior, SVG generation, and digest shape. |
