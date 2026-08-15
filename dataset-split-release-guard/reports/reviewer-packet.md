# Dataset Split Release Guard Report

Generated: 2026-08-15T22:12:47.311Z
Packets analyzed: 4
Decision counts: RELEASE 1, REVIEW_RELEASE 1, HOLD_RELEASE 2

## Findings

### split-release-001: Clean imaging dataset split package for DOI release

Decision: RELEASE
Splits: train, validation, test

- No split release risk detected.

Recommended actions:
- Release split manifests with normal artifact provenance.

### split-hold-002: Clinical split package with patient leakage and embargoed rows

Decision: HOLD_RELEASE
Splits: train, validation, test

- CRITICAL TRAIN_VALIDATION_TEST_RECORD_OVERLAP: One or more records appear in multiple splits.
- CRITICAL GROUP_LEAKAGE_ACROSS_SPLITS: A participant, patient, subject, lab, or other grouping identifier appears across multiple splits.
- MAJOR SPLIT_PROVENANCE_INCOMPLETE: The split generation seed or script hash is missing.
- MAJOR SPLIT_CHECKSUM_COVERAGE_MISSING: One or more split manifests lack checksum or manifest hash evidence.
- MAJOR SPLIT_LICENSE_ACCESS_PARITY_MISMATCH: Split manifests have inconsistent license or access states.
- MAJOR STRATIFICATION_BALANCE_DRIFT: Class or stratum balance differs from the dataset policy beyond the allowed threshold.
- CRITICAL EMBARGOED_RECORD_IN_PUBLIC_SPLIT: Embargoed records are present in one or more release split manifests.
- CRITICAL PUBLIC_RELEASE_NOT_FROZEN_FOR_SPLIT_RISK: Public DOI/API release is enabled while split-integrity findings remain unresolved.

Recommended actions:
- Freeze public DOI/API release and reproducibility badges.
- Attach findings to the dataset release review packet.
- Regenerate split manifests or document curator-approved exceptions.
- Re-run checksum, license, access, and stratification checks before DOI/API release.

### split-review-003: Good disjointness with missing provenance and balance drift

Decision: REVIEW_RELEASE
Splits: train, validation, test

- MAJOR SPLIT_PROVENANCE_INCOMPLETE: The split generation seed or script hash is missing.
- MAJOR STRATIFICATION_BALANCE_DRIFT: Class or stratum balance differs from the dataset policy beyond the allowed threshold.

Recommended actions:
- Attach findings to the dataset release review packet.
- Regenerate split manifests or document curator-approved exceptions.
- Re-run checksum, license, access, and stratification checks before DOI/API release.

### split-hold-004: Missing test split with public release still enabled

Decision: HOLD_RELEASE
Splits: train, validation

- CRITICAL REQUIRED_SPLIT_MISSING: The release packet lacks one or more required train/validation/test split manifests.
- CRITICAL PUBLIC_RELEASE_NOT_FROZEN_FOR_SPLIT_RISK: Public DOI/API release is enabled while split-integrity findings remain unresolved.

Recommended actions:
- Freeze public DOI/API release and reproducibility badges.
- Attach findings to the dataset release review packet.
- Regenerate split manifests or document curator-approved exceptions.
- Re-run checksum, license, access, and stratification checks before DOI/API release.
