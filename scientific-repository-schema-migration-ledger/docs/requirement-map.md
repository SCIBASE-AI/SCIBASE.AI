# Scientific Repository Schema Migration Requirement Map

| Issue #10 capability | Implementation evidence |
| --- | --- |
| Structured project repository metadata | The sample models `metadata.json`, manuscripts, data, code, notebooks, results, and protocols as typed components. |
| File and metadata versioning | `evaluateRepositoryMigration()` compares current and target hashes, versions, schemas, and release tags. |
| Semantic versioning and rollback | The module validates semantic target versions, calculates major/minor/patch impact, and builds rollback plans. |
| Forking with attribution | `checkLineage()` blocks migrated releases that would lose fork attribution. |
| DOI and citation continuity | `checkMetadata()` validates DOI, APA, BibTeX, authors, ORCID, funding, and schema.org type evidence. |
| Export bundle readiness | Compatibility packets include export targets, changed components, blockers, review checks, and packet digests. |
| Auditability | `signAttestation()` creates deterministic HMAC signatures for migration events. |
| Reviewer-ready proof | `npm run check`, `npm test`, `npm run demo`, `docs/demo.svg`, and `docs/demo.gif` provide local verification and a short demo artifact. |

## Non-overlap Notes

This slice focuses on `metadata.json` schema migration and citation continuity. It does not duplicate broad repository ledgers, release engines, structured diffs, embargo controls, provenance attestations, or notebook replay modules already submitted for issue #10.
