# Promotion Dossier Export Report

As of: 2026-06-18

## Summary

- Total dossiers: 4
- Release: 1
- Review: 1
- Hold: 2

## Dossier Decisions

| Researcher | Purpose | Recipient | Decision | Primary reason |
| --- | --- | --- | --- | --- |
| Dr. Lina Park | promotion | institutional-promotion-committee | RELEASE_DOSSIER | All export checks passed |
| Dr. Amara Singh | annual-review | department-chair | HOLD_EXPORT | CONTRIBUTOR_OPT_OUT: Researcher has opted out of institution-facing dossier export. |
| Dr. Theo Imani | grant-report | external-funder | HOLD_EXPORT | BLIND_REVIEW_IDENTITY_LEAK: Review review-blind-2 is anonymous but reviewer identity is not safely redacted. |
| Dr. Noura Bell | tenure | faculty-affairs | REVIEW_BEFORE_EXPORT | BADGE_EVIDENCE_STALE: Badge reproducibility-badge evidence is 550 days old. |

## Remediation Actions

### Dr. Lina Park
- Release dossier to the configured institution-facing recipient.

### Dr. Amara Singh
- Remove this dossier from the export batch or collect updated consent.

### Dr. Theo Imani
- Redact reviewer identity and regenerate the dossier.
- Exclude the restricted review or attach author export consent.
- Refresh badge evidence or annotate the dossier with stale-evidence status.
- Attach source reputation events before export.
- Replace internal conflict notes with a reviewer-safe export summary.

### Dr. Noura Bell
- Attach contribution evidence before using this credit in a dossier.
- Refresh badge evidence or annotate the dossier with stale-evidence status.
