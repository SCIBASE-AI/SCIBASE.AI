# Enterprise Style Package Provenance Report

Institution: northstar-research-office
Review date: 2026-06-01
Decision: hold_enterprise_style_exports
Audit digest: sha256:e519c9e6fe7731dd

## Style Packages

| Package | Target | Plugin | Formats | Templates | Validation age |
| --- | --- | --- | ---: | ---: | ---: |
| horizon-eu-repository-style | Horizon EU grant portal | journal-style-pack@3.5.0 | 1 | 2 | 173d |
| unapproved-preprint-style | bioRxiv | community-style-snapshot@latest | 2 | 0 | missing |

## Findings

- **CRITICAL PLUGIN_NOT_APPROVED**: unapproved-preprint-style uses plugin community-style-snapshot without enterprise approval. Action: `route_plugin_for_enterprise_approval`.
- **CRITICAL PRIVATE_FIELD_EXPORTED_IN_STYLE_PREVIEW**: horizon-eu-repository-style exports private internal style-preview fields. Action: `remove_private_preview_fields_from_export`.
- **CRITICAL TEMPLATE_CHECKSUM_DRIFT**: templates/horizon/report.docx checksum differs from the approved style package manifest. Action: `block_export_until_template_is_rebuilt_from_approved_source`.
- **HIGH CITATION_STYLE_MISMATCH**: horizon-eu-repository-style uses vancouver citations for Horizon EU grant portal which requires apa. Action: `select_target_approved_citation_style`.
- **HIGH EXPORT_FORMAT_COVERAGE_GAP**: horizon-eu-repository-style is missing required export formats: JATS, LaTeX. Action: `add_required_export_format_templates`.
- **HIGH EXPORT_FORMAT_COVERAGE_GAP**: unapproved-preprint-style is missing required export formats: LaTeX. Action: `add_required_export_format_templates`.
- **HIGH EXPORT_METADATA_PRESERVATION_GAP**: horizon-eu-repository-style does not preserve ORCID, version history, funder award metadata across export formats. Action: `preserve_required_publication_metadata`.
- **HIGH EXPORT_METADATA_PRESERVATION_GAP**: unapproved-preprint-style does not preserve DOI, ORCID, version history, license, funder award metadata across export formats. Action: `preserve_required_publication_metadata`.
- **HIGH PLUGIN_VERSION_NOT_APPROVED**: horizon-eu-repository-style uses 3.5.0, which is not in the approved plugin version list. Action: `promote_or_replace_approved_plugin_version`.
- **HIGH PLUGIN_VERSION_NOT_PINNED**: unapproved-preprint-style is missing a pinned semantic plugin version. Action: `pin_plugin_version_before_export`.
- **HIGH STYLE_SIGNOFF_MISSING**: horizon-eu-repository-style lacks approved enterprise reviewer signoff. Action: `obtain_enterprise_style_reviewer_signoff`.
- **HIGH STYLE_SIGNOFF_MISSING**: unapproved-preprint-style lacks approved enterprise reviewer signoff. Action: `obtain_enterprise_style_reviewer_signoff`.
- **HIGH TEMPLATE_MANIFEST_MISSING**: unapproved-preprint-style has no template checksum manifest. Action: `attach_template_checksum_manifest`.
- **MEDIUM OUTPUT_PROVENANCE_DIGEST_MISSING**: horizon-eu-repository-style has 1 generated outputs without build provenance digests. Action: `record_output_build_provenance_digests`.
- **MEDIUM STYLE_VALIDATION_STALE**: horizon-eu-repository-style style validation is 173 days old. Action: `rerun_style_export_validation`.
- **MEDIUM STYLE_VALIDATION_STALE**: unapproved-preprint-style style validation is missing. Action: `rerun_style_export_validation`.
- **MEDIUM TEMPLATE_CHECKSUM_INCOMPLETE**: templates/horizon/article.jats.xml lacks both expected and actual checksums. Action: `record_expected_and_actual_template_checksums`.

## Required Export Formats

- JATS
- DOCX
- LaTeX
