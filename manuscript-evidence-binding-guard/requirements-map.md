# Requirements Map

| Issue #12 requirement | Evidence in this PR |
| --- | --- |
| Rich scientific formatting with cross-references | Validates figures, tables, equations, citation keys, and DOI-backed evidence anchors before export. |
| Jupyter notebook integration | Checks notebook output digests, source cell paths, upstream dataset/code digests, and stale outputs. |
| Real-time collaboration readiness | Uses locked section version hashes and release freeze metadata to prevent collaborators from exporting stale evidence. |
| Version history and autosave | Compares current section version hashes and evidence digests against approved release bindings. |
| Inline reviewer workflow | Emits reviewer actions and a Markdown review packet with blocking fixes for stale or unbound evidence. |
| Short demo video | Includes `reports/demo.mp4` as the walkthrough artifact. |
| Tests and validation | Includes dependency-free Node tests and syntax checks through `npm run check` and `npm test`. |

## Non-Overlap Note

This slice does not implement another editor UI, operation ledger, offline conflict resolver, notebook workbench, reference formatter, authorship gate, freeze lane, figure/table review lane, discussion sidebar audit, autosave recovery, round-trip fidelity checker, review decision ledger, task dependency guard, equation/figure anchor lock, kernel lease guard, presence privacy guard, or accessibility parity guard.

Its scope is evidence binding at submission export time: every release claim and asset must point to current, locked, approved evidence with traceable digests and citation metadata.
