# Collaborative catalyst manuscript

Scenario: risky-document

Decision: HOLD

Reviewed 2 document blocks and 1 collaborator suggestions.

## Findings

- MEDIUM MISSING_FIRST_USE_EXPANSION: HER appears without its first-use expansion.
- MEDIUM MISSING_FIRST_USE_EXPANSION: FE appears without its first-use expansion.
- HIGH UNIT_CONFLICT: temperature uses "C" but canonical unit is "K".
- HIGH VARIABLE_MEANING_DRIFT: eta means "efficiency" here but shared definition is "overpotential".
- HIGH ACRONYM_DRIFT: RHE is defined as "rapid heat exchange" but glossary expects "reversible hydrogen electrode".
- HIGH UNIT_CONFLICT: currentDensity uses "A m^-2" but canonical unit is "mA cm^-2".
- HIGH UNIT_CONFLICT: potential uses "V vs Ag/AgCl" but canonical unit is "V vs RHE".
- HIGH VARIABLE_MEANING_DRIFT: j means "flux" here but shared definition is "current density".
- LOW UNREGISTERED_VARIABLE: E is used in an equation context without a shared definition.
- HIGH ACRONYM_DRIFT: RHE is defined as "rapid heat exchange" but glossary expects "reversible hydrogen electrode".

## Release Criteria

- Shared glossary acronyms keep one expansion across all blocks and suggestions.
- Scientific quantities use the canonical unit selected for the collaborative document.
- Equation variables keep one meaning before WYSIWYG, Markdown, LaTeX, or export render.
- Suggestions cannot introduce terminology drift while being accepted into the manuscript.
