# Supplementary Media Accessibility Review: synthetic-embargoed-behavior-video-v1

Decision: **hold_media_preview_release**
Audit digest: `sha256:9a556f472cf3e16c`

## Findings

| Severity | Code | Message | Action |
| --- | --- | --- | --- |
| critical | `EMBARGOED_MEDIA_PUBLIC_PREVIEW` | embargoed-protocol-video is previewable while embargoed for 24 more days. | `hold_embargoed_media_preview` |
| critical | `RESTRICTED_MEDIA_PUBLIC_PREVIEW` | embargoed-protocol-video is restricted but marked for public preview. | `disable_public_preview_for_restricted_media` |
| high | `ALT_TEXT_MISSING_OR_TOO_SHORT` | microscopy-panel-no-alt needs descriptive alt text before public preview. | `add_descriptive_alt_text` |
| high | `PREVIEW_SOURCE_CHECKSUM_DRIFT` | embargoed-protocol-video preview source checksum does not match the current artifact checksum. | `regenerate_preview_from_current_artifact` |
| high | `THUMBNAIL_PROVENANCE_DRIFT` | embargoed-protocol-video thumbnail was generated from a checksum that differs from the hosted source artifact. | `regenerate_thumbnail_from_current_artifact` |
| high | `TRANSCRIPT_COVERAGE_INCOMPLETE` | embargoed-protocol-video has 42% transcript coverage. | `complete_timecoded_transcript` |
| medium | `ACCESSIBILITY_METADATA_INCOMPLETE` | embargoed-protocol-video is missing accessibility metadata: accessMode, accessibilityFeature, schemaOrgType. | `complete_datacite_schema_org_accessibility_metadata` |
| medium | `ACCESSIBILITY_METADATA_INCOMPLETE` | microscopy-panel-no-alt is missing accessibility metadata: accessibilityFeature. | `complete_datacite_schema_org_accessibility_metadata` |
| medium | `CAPTION_MISSING_OR_TOO_SHORT` | embargoed-protocol-video needs a reviewer-facing caption for preview and export packets. | `add_reviewer_caption` |
| medium | `CAPTION_MISSING_OR_TOO_SHORT` | microscopy-panel-no-alt needs a reviewer-facing caption for preview and export packets. | `add_reviewer_caption` |
| medium | `TIMECODE_LABEL_MISSING` | embargoed-protocol-video has 1 transcript segments without scientific labels. | `label_transcript_segments` |

## Media Coverage

| Artifact | Type | Public preview | Alt text | Caption | Transcript coverage | Metadata |
| --- | --- | --- | --- | --- | --- | --- |
| embargoed-protocol-video | protocol_video | yes | no | no | 42% | incomplete |
| microscopy-panel-no-alt | microscopy_image | yes | no | no | n/a | incomplete |

Synthetic data only. No live media stores, private projects, uploaded datasets, credential stores, payment systems, financial accounts, or external APIs are used.
