# Editor Accessibility Parity Packet

Document: Collaborative Protein Folding Review (collab-manuscript-alpha)
Decision: blocked
Release hold: yes
Audit digest: 1138fa9973912f301288cb49793b5ed149fe3a941115020bbeda930bcf18c2b9

## Block Decisions

| Block | Type | Decision | Section |
| --- | --- | --- | --- |
| h-abstract | heading | approved | abstract |
| eq-loss | equation | approved | methods |
| fig-fold | figure | approved | results |
| code-metrics | code | approved | analysis |
| nb-review | notebook | needs_review | analysis |
| eq-unreadable | equation | blocked | supplement |
| fig-unlabeled | figure | blocked | supplement |
| cite-main | citation | needs_review | introduction |

## Blockers

- equation_fallback_missing: Equation block needs fallback text for WYSIWYG and screen-reader parity.
- figure_alt_text_missing: Figure block needs alt text for accessible public export.

## Warnings

- notebook_output_stale: Notebook output is stale relative to the current source cell.
- figure_anchor_missing: Figure is referenced but lacks a stable cross-reference anchor.
- wysiwyg_preview_missing: Non-text scientific blocks need a plain-language WYSIWYG preview for non-technical collaborators.
- citation_preview_missing: Citation block is missing the formatted preview shown in WYSIWYG mode.

## Reviewer Tasks

- Resolve missing alt text and equation fallback text before public export.
- Refresh notebook output summaries and execution metadata before collaborative review.
- Complete WYSIWYG previews and keyboard labels for non-technical collaborators.
- Keep affected blocks in review hold until accessibility blockers are cleared.
