# Embargoed Data License Guard Demo

| License | Customer | Export | Decision | Finance action |
| --- | --- | --- | --- | --- |
| lic-gov-neuro-2026 | NIH Policy Lab | api | RELEASE | release_export_and_invoice |
| lic-market-rare-disease-2026 | Market Intel A | periodic_snapshot | REVIEW | route_to_licensing_operations |
| lic-exclusive-funder-2026 | Regional Consortium | white_label | HOLD | hold_export_and_block_invoice |

### lic-gov-neuro-2026

  - RELEASE: no blocking findings

### lic-market-rare-disease-2026

  - REVIEW: EARLY_ACCESS_REVIEW - Export is still under embargo but has an early-access approval.
  - REVIEW: CONSENT_GAP - Consent coverage 92% is below required 95%.

### lic-exclusive-funder-2026

  - HOLD: EXCLUSIVITY_CONFLICT - License conflicts with an active exclusive customer grant.
  - HOLD: COHORT_TOO_SMALL - Cohort size 42 is below minimum 100.
  - REVIEW: CONSENT_GAP - Consent coverage 88% is below required 95%.
  - HOLD: TIER_NOT_ENTITLED - Dashboard license does not permit white_label exports.
  - REVIEW: MISSING_RELEASE_TERMS - Missing data processing agreement, redaction profile, attribution text.
  - REVIEW: STALE_SNAPSHOT - Snapshot is 57 days old; maximum is 30.
