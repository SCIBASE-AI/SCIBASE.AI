# Institutional Sanctions Export Guard

Batch: institutional-eligibility-2026-05-28
Generated: 2026-05-28T12:55:00Z

## Summary

- Total requests evaluated: 4
- Compliance holds: 2
- Manual billing reviews: 1
- Recognizable revenue: $24000
- Deferred revenue: $202000
- Recommended action: pause-institutional-revenue-activation
- Audit digest: sha256:32c9498352303c377a36cca197d413edce926ebac3c8d1d29d778e41192d3e44

## Eligibility Decisions

- license-cryo-bio-east: compliance-hold (restricted-party-match, restricted-jurisdiction, export-controlled-compute, missing-export-clearance)
- license-quantum-lab: compliance-hold (export-controlled-compute, missing-export-clearance)
- license-field-consortium: manual-billing-review (payment-rail-unavailable)
- license-open-neuro: activate-revenue

## Compliance Tasks

- task-license-cryo-bio-east (high): collect-export-clearance-before-revenue-activation
- task-license-quantum-lab (high): collect-export-clearance-before-revenue-activation
- task-license-field-consortium (normal): route-to-supported-institutional-payment-rail

## Privacy Notes

Buyer contacts, tax identifiers, private payment references, and live customer records are not emitted. The packet uses synthetic data only and makes no external sanctions, payment, bank, or identity-provider calls.
