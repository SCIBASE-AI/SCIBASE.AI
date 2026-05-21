# Data Dictionary Release Gate Report

Generated datasets: 4
Passed: 1
Needs revision: 1
Held: 2
Blockers: 7
Warnings: 7
Audit digest: `becb8461629192c9024d4711c90bd0b7aa8faadad20d919312afdba2ef2a8447`

## Dataset Decisions

### DD-PASS-001: Enzyme kinetics reference release
- Status: pass
- Release target: public DOI package
- Files: 1
- Columns: 5
- Dictionary entries: 5
- License: CC-BY-4.0
- Findings: none
- First action: Approve dataset release with the current dictionary and metadata packet.

### DD-REV-002: Field ecology observation release
- Status: revise
- Release target: embargoed public dataset
- Files: 1
- Columns: 4
- Dictionary entries: 4
- License: CC-BY-4.0
- Findings: PERSISTENT_IDENTIFIER_MISSING, DISCOVERY_METADATA_INCOMPLETE, SEMANTIC_TAGS_INCOMPLETE, UNIT_STANDARD_MISSING, MISSINGNESS_REASON_RECOMMENDED
- First action: Release metadata should include a DOI, ARK, or planned persistent identifier.

### DD-HOLD-003: Pressure chamber telemetry
- Status: hold
- Release target: instrument telemetry archive
- Files: 1
- Columns: 4
- Dictionary entries: 4
- License: CC0-1.0
- Findings: FILE_CHECKSUM_MISSING, UNDOCUMENTED_COLUMNS, ORPHAN_DICTIONARY_ENTRIES, MEASUREMENT_UNIT_MISSING, UNIT_STANDARD_MISSING, MEASUREMENT_UNIT_NOT_STANDARD
- First action: Add stable checksums for every release artifact.

### DD-HOLD-004: Clinical biomarker supplement
- Status: hold
- Release target: controlled clinical supplement
- Files: 1
- Columns: 4
- Dictionary entries: 4
- License: all-rights-reserved
- Findings: LICENSE_NOT_RELEASE_READY, SENSITIVE_VARIABLE_RELEASED, MISSINGNESS_REASON_REQUIRED
- First action: Select an approved release license before publishing.
