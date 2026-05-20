# Requirements Map

## Issue #14: Scientific/Engineering Data & Code Hosting

| Requirement | Coverage |
| --- | --- |
| Support for raw instrument outputs | `SUPPORTED_RAW_TYPES` classifies `.fcs`, `.mzml`, `.nd2`, and `.h5` artifacts. |
| Metadata-aware previews | `previewDecision` verifies required instrument metadata before generating preview descriptors. |
| Structured metadata standards | `buildDataCitePacket` and `buildSchemaOrgPacket` emit DataCite-style and schema.org-compatible metadata. |
| FAIR reusable metadata | Decisions preserve checksums, licenses, units, calibration, preview policies, and creators. |
| Versioning and diff safety | Checksum and metadata drift block or downgrade previews before researchers inspect stale transformed data. |
| Access and licensing controls | Restricted licenses and embargoed artifacts require metadata-only previews. |
| Executable/reproducible preview transforms | `validatePreviewTransform` requires deterministic, lineage-recording transforms that do not expose raw values. |
| Tests and demo | `test.js` covers safe previews, checksum drift blocks, unit/calibration drift, restricted/embargo behavior, unsupported types, DataCite, and schema.org output. `demo.js` emits JSON and SVG artifacts. |

## Acceptance Notes

- Synthetic data only; no external service calls or private data.
- No dependencies beyond the Node.js standard library.
- This is preview-safety logic for raw instrument outputs, not another broad storage manifest.
- Blocked previews preserve reviewer-visible reasons and metadata packets rather than silently failing.
