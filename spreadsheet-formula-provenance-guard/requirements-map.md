# Requirements Map

Issue #14 asks for scientific data and code hosting with major file-type support, metadata-aware previews, upload versioning and diffing, FAIR-oriented metadata, executable/reusable artifacts, and machine-discoverable exports.

This slice covers a focused spreadsheet dataset gate:

- Major file types: targets `.xlsx`/`.xlsm` spreadsheet datasets before they are accepted as research artifacts.
- Metadata-aware previews: blocks previews when formula-derived values lack recalculation evidence or provenance.
- Upload versioning and diffing: requires stable SHA-256 digests for the original workbook and normalized exports.
- Reusable data: requires CSV or parquet normalized exports so reviewers can inspect data without spreadsheet software.
- FAIR and provenance: requires formula source references for derived values and flags hidden sheets, volatile functions, macros, and external workbook links.

Out of scope by design: broad repository manifests, executable sandboxes, model cards, data dictionaries, malware/archive scans, access embargoes, and accessibility previews, because those are already covered by separate same-issue slices.
