# Requirements Map

Issue #12 asks for a real-time collaborative research editor and interface. This PR adds a focused acceptance provenance guard for the suggestion workflow.

| Issue Capability | Guard Coverage |
| --- | --- |
| Inline comments and suggestions | Validates suggestions before acceptance and links findings to suggestion IDs. |
| Section locks | Enforces protected-section lock overrides against the current section hash. |
| Version history and autosave safety | Blocks stale section-hash acceptance and emits provenance digests. |
| Notebook/code-cell collaboration | Defers acceptance when related notebook outputs are stale. |
| Review workflow | Blocks unresolved reviewer replies and missing author approvals. |
| Auditability | Produces deterministic JSON packets, Markdown report, SVG summary, MP4 demo, and SHA-256 audit digest. |

## Non-Overlap Note

This is not another broad editor foundation, operation replay engine, offline conflict resolver, notebook workbench, reference formatter, authorship governance gate, freeze/recovery lane, autosave recovery module, round-trip checker, review decision ledger, accessibility guard, presence liveness guard, or LaTeX macro safety slice. It focuses narrowly on accepted suggestion provenance.
