# Manuscript Unit Consistency Report

Manuscript: Metabolic rescue assay draft with unit hygiene risks
Audit digest: 66b689128bf18282
Readiness: block-before-submission (2/100)

## Findings

- HIGH range-outlier: 370 C is outside a plausible wet-lab manuscript temperature range.
  Evidence: A draft assay note says the plate was heated to 370 C for 15 min.
  Action: Confirm whether this is a typo, a specialized protocol condition, or a missing decimal point.
- HIGH unit-family-conflict: metformin uses both molar and mass concentration units.
  Evidence: methods-cell-culture: 5 mM; methods-cell-culture: 2 mg/mL
  Action: Add a molecular-weight conversion note or standardize the manuscript to one concentration basis.
- MEDIUM missing-unit: Numeric value "12,000" appears without an adjacent unit in Methods: cell culture and dosing.
  Evidence: Pellets were centrifuged at 12,000 for 10 min before lysis.
  Action: Add the intended unit or rewrite the sentence so the quantity is unambiguous.
- MEDIUM table-unit-drift: TNF-alpha cell unit ng/mL does not match header unit pg/mL.
  Evidence: Table 1. Inflammation marker summary, row 1, column "TNF-alpha (pg/mL)": 0.09 ng/mL
  Action: Convert the cell value to the header unit or split the column by unit.
- MEDIUM table-unit-drift: IL-6 cell unit ng/mL does not match header unit pg/mL.
  Evidence: Table 1. Inflammation marker summary, row 2, column "IL-6 (pg/mL)": 0.21 ng/mL
  Action: Convert the cell value to the header unit or split the column by unit.
- MEDIUM missing-unit: Numeric value "35" appears without an adjacent unit in Results: cytokine response.
  Evidence: ATP increased by 35 compared with vehicle control.
  Action: Add the intended unit or rewrite the sentence so the quantity is unambiguous.
- LOW unit-scale-drift: IL-6 is reported in multiple unit scales: pg/mL, ng/mL.
  Evidence: results-cytokines: 180 pg/mL; results-cytokines: 0.22 ng/mL; table-cytokines: 180 pg/mL; table-cytokines: 0.21 ng/mL
  Action: Keep the source units if scientifically useful, but include a normalized value for reviewer comparison.
- LOW unit-scale-drift: TNF-alpha is reported in multiple unit scales: ng/mL, pg/mL.
  Evidence: table-cytokines: 0.09 ng/mL; table-cytokines: 70 pg/mL
  Action: Keep the source units if scientifically useful, but include a normalized value for reviewer comparison.

## Reviewer Actions

- P1 Confirm whether this is a typo, a specialized protocol condition, or a missing decimal point. (results-cytokines)
- P1 Add a molecular-weight conversion note or standardize the manuscript to one concentration basis. (methods-cell-culture,methods-cell-culture)
- P2 Add the intended unit or rewrite the sentence so the quantity is unambiguous. (methods-cell-culture)
- P2 Convert the cell value to the header unit or split the column by unit. (table-cytokines)
- P2 Convert the cell value to the header unit or split the column by unit. (table-cytokines)
- P2 Add the intended unit or rewrite the sentence so the quantity is unambiguous. (results-cytokines)
- P3 Keep the source units if scientifically useful, but include a normalized value for reviewer comparison. (results-cytokines,results-cytokines,table-cytokines,table-cytokines)
- P3 Keep the source units if scientifically useful, but include a normalized value for reviewer comparison. (table-cytokines,table-cytokines)

## Measurement Inventory

- methods-cell-culture: 20,000 cells/well -> count_density (cells/well 96-well)
- methods-cell-culture: 5 mM -> molar_concentration (metformin)
- methods-cell-culture: 24 h -> time (metformin)
- methods-cell-culture: 2 mg/mL -> mass_concentration (metformin)
- methods-cell-culture: 5 mg/mL -> mass_concentration (glucose)
- methods-cell-culture: 6 h -> time (glucose)
- methods-cell-culture: 10 min -> time (min before)
- results-cytokines: 180 pg/mL -> mass_concentration (IL-6)
- results-cytokines: 0.22 ng/mL -> mass_concentration (IL-6)
- results-cytokines: 370 C -> temperature (heated C)
- results-cytokines: 15 min -> time (heated C)
- table-cytokines: 180 pg/mL -> mass_concentration (IL-6)
- table-cytokines: 0.09 ng/mL -> mass_concentration (TNF-alpha)
- table-cytokines: 0.21 ng/mL -> mass_concentration (IL-6)
- table-cytokines: 70 pg/mL -> mass_concentration (TNF-alpha)
