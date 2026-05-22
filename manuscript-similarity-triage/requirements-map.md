# Requirements Map

## Paper Summarizer

- Produces a passage-level audit digest that can be attached to generated summaries before collaborators or funders receive them.
- Prevents summary-ready status when source overlap is unresolved.

## Peer Review Aid

- Implements the similarity/plagiarism triage portion of the peer-review diagnostic report.
- Flags uncited source overlap, retracted-source reuse, close paraphrase risk, and self-overlap disclosure gaps.
- Separates acceptable cited methods/protocol boilerplate from high-risk copied claims.

## Citation Tool

- Uses passage citations and source metadata to decide whether overlap is cited, missing attribution, or still too close to source wording.
- Emits reviewer actions that can become citation insertion or rewrite tasks.

## Why This Is Distinct

Existing #13 submissions cover broad summarization, evidence verification, methods reproducibility, figure/table evidence, protocol deviation, novelty overlap, citation diversity/style, supplementary readiness, and contradiction triage. This slice focuses on source-overlap review and attribution risk before a manuscript draft is shared.
