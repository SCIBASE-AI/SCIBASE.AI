# Requirements Map

Issue #14 requirement | Coverage in this module
--- | ---
Support datasets such as CSV/TSV/JSON | Uses synthetic CSV/TSV file manifests with explicit column inventories.
Metadata-aware previews and reusable artifacts | Validates dictionary entries, variable labels, descriptions, data types, units, semantic tags, and schema mappings.
Structured metadata and standards | Checks schema.org type, DataCite creators, persistent identifiers, license, access policy, and checksums.
FAIR reusable data | Flags missing units, undocumented columns, unexplained missingness, weak semantic tags, and non-release-ready licenses.
Access control and sensitive data handling | Blocks release when sensitive or identifying variables are included without exclusion or de-identification.
Reviewer-ready evidence | Generates JSON, Markdown, SVG, and MP4 artifacts plus deterministic audit digests.

## Non-overlap Notes

This PR avoids duplicating existing SCIBASE issue #14 slices for license compatibility, sensitive-file redaction, schema evolution, artifact preview integrity, preview cache handling, retention tombstones, model-card weight lineage, and raw instrument preview checks. The implementation targets data dictionary completeness and measurement metadata before release.
