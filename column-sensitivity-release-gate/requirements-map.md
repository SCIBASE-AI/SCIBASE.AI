# Requirements Map

Issue #14 asks for Scientific Data & Code Hosting with metadata-aware previews, versioned datasets, FAIR-ready metadata, API access, and export lanes. This PR adds a focused column-level sensitivity gate before those release lanes are enabled.

| Issue Capability | Gate Coverage |
| --- | --- |
| Metadata-aware dataset previews | Blocks preview when sensitive columns are unsafe. |
| API-accessible research assets | Gates public API access on column transforms and approvals. |
| FAIR reusable datasets | Requires k-anonymity, steward approval, and release evidence for sensitive columns. |
| Dataset version/release workflows | Emits release/hold queues and deterministic audit packets. |
| Export bundles | Blocks export bundles when identifiers, free text, or precise locations are unsafe. |
| Reviewer-safe evidence handling | Blocks malformed dataset or column evidence instead of crashing before packet generation. |
| Reviewer demo artifact | Generates JSON, Markdown, SVG, and MP4 demo outputs. |

## Non-Overlap Note

This is not another FAIR manifest, artifact package integrity, preview cache, raw/notebook preview, retention/tombstone, model-card lineage, license compatibility, sensitive-file redaction, schema-evolution, data-dictionary, persistent-ID, SBOM, upload checkpoint, or artifact-replica slice. It focuses narrowly on column-level release decisions for hosted datasets.
