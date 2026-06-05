# Supplementary Materials Export Report

Generated: 2026-06-05T15:10:00.000Z

Manuscript: `ms-collab-neuro-042`

Decision: `hold`

## Summary

- Supplements checked: 3
- Blockers: 6
- Warnings: 3

## Release Blockers

- `supp-table-2`: exported hash is stale against the current source artifact.
- `supp-table-2`: notebook-derived output is stale or missing execution evidence.
- `supp-table-2`: restricted data lacks approved redaction review.
- `supp-table-2`: private reviewer notes are included in the public export.
- `supp-table-2`: one blocking supplement comment is still unresolved.
- `supp-protocol-3`: supplement is included in the export packet but not cited by the manuscript.

## Required Remediation

1. Re-run notebook-backed supplementary materials and regenerate exports.
2. Complete data-steward redaction review for restricted tables.
3. Strip private reviewer notes from public artifacts.
4. Resolve blocking comments or record explicit waiver evidence.
5. Add stable manuscript citations for every exported supplement.
6. Attach approved license metadata and lock supplement sections before export.

## Scope Mapping

This supports SCIBASE.AI issue #12 by adding a publication-export readiness guard inside the real-time collaborative editor workflow for scientific manuscript supplements.
