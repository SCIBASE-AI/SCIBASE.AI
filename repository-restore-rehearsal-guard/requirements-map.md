# Requirements Map

| Issue #10 requirement | Implementation coverage |
| --- | --- |
| File and metadata versioning | Checks immutable snapshot ids, semantic tags, refs, component hashes, and export manifest linkage. |
| Git-compatible repository lifecycle | Validates protected branch refs and release tags before export. |
| Hash-based integrity | Compares expected component hashes with restored snapshot artifact hashes. |
| Git LFS / large files | Requires large or restricted artifacts to have ready mirrors with matching digests. |
| Computation-aware reproducibility | Requires recent passed restore drills, environment locks, and notebook replay evidence. |
| Repository identifiers and citation | Blocks export when the DOI/export manifest is missing or points at the wrong snapshot. |
| Programmatic export | Emits a deterministic release queue, remediation queue, and audit packet suitable for API or reviewer dashboard integration. |

## Non-Overlap Notes

This PR is scoped to restore rehearsal readiness. It does not implement generic repository ledgers, rollback UI, legal-hold workflows, release embargo, access review, dependency licensing, component-owner approval quorum, or sensitive-artifact scanning.
