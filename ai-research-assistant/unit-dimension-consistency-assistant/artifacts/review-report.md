# Unit and Dimension Consistency Review

## Summary

- Manuscripts reviewed: 4
- Reviewer-ready: 1
- Held for correction: 3
- High-severity findings: 5
- Medium-severity findings: 1

## Manuscript Reports

### ms-clean-dose

- Title: Dose-normalized response in engineered organoids
- Decision: ready
- Findings: 0

### ms-mixed-dimensions

- Title: Transcript abundance and reagent mass in a shared claim
- Decision: hold
- Findings: 2
  - high: incompatible_dimensions - Claim compares mass, ratio measurements without a conversion model.
  - high: unexpected_dimension - reagent-mass uses mass, but the claim expects ratio.

### ms-rate-denominator

- Title: Event-rate summary across monitoring windows
- Decision: hold
- Findings: 3
  - high: rate_denominator_mismatch - daily-window is normalized per day, but the claim is per hour.
  - high: derived_value_mismatch - Claim reports 13.3333x, but evidence supports 0.56x.
  - medium: over_precise_derived_claim - Derived fold change uses more significant digits than the source measurements justify.

### ms-missing-basis

- Title: Cell density without volume normalization
- Decision: hold
- Findings: 1
  - high: missing_normalization_basis - well-a-density is missing required volume normalization evidence.

