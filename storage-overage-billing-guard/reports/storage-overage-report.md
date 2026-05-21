# Storage Overage Billing Guard Report

Generated: 2026-05-21T12:13:50.774Z

## Summary

- Accounts evaluated: 4
- Invoice-ready accounts: 1
- Ops-review holds: 2
- Monthly recoverable storage revenue: $190.09
- Annualized run rate: $2,281.08
- Unmetered leakage caught: $15.54
- Purge candidates: 82 GB
- Deletion-hold conflicts: 1

## Account Decisions

| Institution | Decision | Charge | Overage | Actions |
| --- | --- | ---: | --- | --- |
| Atlas Neuroscience Lab | invoice_ready | $85.75 | 345 GB private<br>95 GB artifacts<br>0 GB licensed cache | prepare 2026-05 storage overage line item for $85.75 |
| Civic Genomics Institute | hold_for_ops_review | $93.00 | 120 GB private<br>0 GB artifacts<br>255 GB licensed cache | prepare 2026-05 storage overage line item for $93<br>route deletion-hold conflict to compliance owner before changing retention state |
| Northern Lights BioArchive | hold_for_ops_review | $11.34 | 54 GB private<br>0 GB artifacts<br>0 GB licensed cache | attach meter tags to external bucket storage before invoice release<br>review or purge 82 GB of stale artifacts |
| Quantum Field Consortium | monitor | $0.00 | 0 GB private<br>0 GB artifacts<br>0 GB licensed cache | no billing action required this period |
