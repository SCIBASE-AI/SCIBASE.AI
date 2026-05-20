# Requirements Map

| Issue #12 requirement | Implementation coverage |
| --- | --- |
| Inline comments, suggestions, and change tracking | Blocks publish when comments or suggestions remain unresolved. |
| Locking/unlock modes for controlled sections | Requires `freeze-window` locks before publish review. |
| Document chat or discussion sidebar per section | Requires recorded decision records for each section. |
| Version history and autosave | Requires restore-ready snapshots before release. |
| Jupyter notebook integration | Checks notebook output freshness and source hash drift. |
| Multi-user collaborative workflow | Requires role approvals from author, statistician, and data-owner roles. |
| Review and publication workflow | Emits per-section release decisions and document-level priority actions. |
| Auditability | Emits deterministic `crdl_` decision digests from section facts. |

## Non-Overlap Statement

This slice focuses on final collaborative review decisions before freeze/publish. It does not duplicate broad editor models, operation replay, offline conflict rebasing, notebook collaboration, reference formatting, authorship governance, lock recovery, freeze lanes, figure/table review, discussion sidebar audit, autosave recovery, or round-trip fidelity checks.
