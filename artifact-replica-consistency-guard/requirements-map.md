# Requirements Map

Issue #14 asks for scalable storage, structured metadata, FAIR compliance, executable environments, previews, persistent access, and versioned artifacts. This slice focuses on replica consistency as a storage safety layer.

| Issue requirement | Implementation coverage |
| --- | --- |
| Scalable storage engine | `replicas[]` models primary storage, cold archive, institutional mirror, and public mirror states. |
| Major artifact types | Synthetic scenarios cover datasets, notebooks, and model capsules. |
| Metadata-aware previews | `actionsRequested` and `visibleActions` decide when previews are safe despite mirror repair needs. |
| Upload versioning and diffing | `manifestVersion` comparison catches replica drift before versions are exposed. |
| JSON-LD/DataCite/schema.org readiness | `landingPage` checks validate DataCite DOI and schema.org URL alignment against canonical metadata. |
| FAIR accessibility and reusability | Access-policy parity checks protect persistent links, previews, exports, and reproduce actions. |
| Executable environments and reproduce buttons | `enable-reproduce` is gated when replica evidence is inconsistent. |
| Reviewer-ready demo | `demo.js` writes JSON, Markdown, SVG, and H.264 MP4 artifacts in `reports/`. |
| Safe local verification | `test.js` covers hold, repair-review, and publish outcomes with no external calls or secrets. |

## Distinctness

This module avoids duplicating existing issue #14 slices by staying narrow: it does not implement a broad FAIR manifest, access/compute governance, executable-environment drift, provenance chain, quarantine/rerun guard, storage quota/dedupe ledger, resumable upload checkpoint guard, artifact package integrity gate, preview cache guard, raw-instrument preview gate, notebook preview gate, retention/tombstone ledger, model-card lineage gate, license compatibility gate, sensitive-redaction gate, schema-evolution checker, data dictionary release gate, persistent-ID guard, or SBOM quarantine gate. It validates whether already-hosted replicas agree enough to safely expose artifact actions.
