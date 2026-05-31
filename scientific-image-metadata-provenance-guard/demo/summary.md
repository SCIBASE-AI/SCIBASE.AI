# Scientific Image Metadata Provenance Guard Summary

- Total records: 5
- Publish: 1
- Review: 2
- Block: 2
- Safe graph edges: 22
- Redactions: 4

| Image | Decision | Release scope | Findings |
| --- | --- | --- | --- |
| IMG-CELL-001 | publish | public_kg | none |
| IMG-SLIDE-002 | review | review_queue | MISSING_CHANNELS, MISSING_PIXEL_SIZE |
| IMG-PATH-003 | block | do_not_publish | ACQUIRED_AFTER_PUBLICATION, NON_PUBLIC_ACCESS, LICENSE_REVIEW_REQUIRED, PRIVATE_TAG_PRESENT, PRIVATE_VALUE_IN_FILENAME, PRIVATE_METADATA_FIELD, PRIVATE_METADATA_FIELD |
| FIG-DERIVED-004 | block | do_not_publish | MISSING_DERIVED_SOURCE |
| IMG-EMBARGO-005 | review | internal_review_only | MISSING_CHANNELS, NON_PUBLIC_ACCESS, LICENSE_REVIEW_REQUIRED |

## Reviewer Actions

### IMG-SLIDE-002
- REVIEW MISSING_CHANNELS: Microscopy image should include channel metadata before KG recommendation use.
- REVIEW MISSING_PIXEL_SIZE: Microscopy image should include pixel_size_um for scale-aware graph navigation.

### IMG-PATH-003
- BLOCK ACQUIRED_AFTER_PUBLICATION: Image acquisition date is later than the publication date.
- REVIEW NON_PUBLIC_ACCESS: Image is not public and should be kept out of the public KG release.
- REVIEW LICENSE_REVIEW_REQUIRED: Image license is missing or not clearly open for graph publication.
- BLOCK PRIVATE_TAG_PRESENT: Privacy tags indicate private identifiers that must not enter public KG nodes.
- BLOCK PRIVATE_VALUE_IN_FILENAME: Filename appears to contain private identifiers.
- BLOCK PRIVATE_METADATA_FIELD: Metadata contains a private field name or value.
- BLOCK PRIVATE_METADATA_FIELD: Metadata contains a private field name or value.
- Redact `privacy_tags`: remove from public graph payload
- Redact `filename`: replace with stable image_id
- Redact `metadata.mrn`: drop before KG release
- Redact `metadata.patient_name`: drop before KG release

### FIG-DERIVED-004
- BLOCK MISSING_DERIVED_SOURCE: Derived figure cannot enter the KG without source image or artifact lineage.

### IMG-EMBARGO-005
- REVIEW MISSING_CHANNELS: Microscopy image should include channel metadata before KG recommendation use.
- REVIEW NON_PUBLIC_ACCESS: Image is not public and should be kept out of the public KG release.
- REVIEW LICENSE_REVIEW_REQUIRED: Image license is missing or not clearly open for graph publication.
