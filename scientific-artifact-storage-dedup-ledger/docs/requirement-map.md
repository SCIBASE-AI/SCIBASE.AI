# Scientific Artifact Storage Deduplication Requirement Map

| Issue #14 capability | Implementation evidence |
| --- | --- |
| Scalable storage engine | `evaluateStorageBook()` models logical bytes, physical bytes after deduplication, quotas, storage decisions, and tier plans. |
| Upload versioning and diffing | `buildBlobInventory()` groups versioned artifacts by content hash and records duplicate references/savings. |
| Metadata-aware previews | `checkPreviewInvalidation()` flags stale previews before reviewer/export workflows. |
| Support for datasets, notebooks, models, raw output | Synthetic sample artifacts include datasets, notebooks, models, and raw instrument archives. |
| Executable environment readiness support | Large artifacts and active notebooks are routed to hot/warm/cold tiers that compute runners can consume predictably. |
| FAIR/reproducibility operations | Missing content hashes block release because dedupe, provenance, and reproducible storage need hash evidence. |
| Auditability | Project audit digests and signed events make storage changes reviewable without external services. |
| Reviewer-ready proof | `npm run check`, `npm test`, `npm run demo`, `docs/demo.svg`, and `docs/demo.gif` provide local verification and a short demo artifact. |

## Non-overlap Notes

This slice focuses on content-addressed storage, deduplication, quota, and tiering decisions. It does not duplicate FAIR manifest validators, artifact provenance chains, quarantine gates, release packaging, or executable rerun governance modules already submitted for issue #14.
