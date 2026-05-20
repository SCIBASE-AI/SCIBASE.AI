# Round-Trip Fidelity Review: Hybrid Bayesian Imaging Biomarkers

Decision: **repair-before-submit**
Average fidelity: **35**
Total findings: **14**

## Formats
- notebook: repair-before-submit (10)
- latex: repair-before-submit (36)
- markdown: repair-before-submit (60)

## Repair Queue

### markdown
Score: 60
Decision: repair-before-submit
- [medium] Citation keys missing after round trip for table-cohorts: harmonization-lockfile.
  Task: Preserve citation keys metadata for table-cohorts in this format.
- [medium] Unresolved suggestions missing after round trip for table-cohorts: add missing data footnote.
  Task: Preserve unresolved suggestions metadata for table-cohorts in this format.
- [high] markdown round trip lost produces-summary link cell-harmonize -> table-cohorts.
  Task: Preserve cross-reference cell-harmonize -> table-cohorts during markdown import.

### latex
Score: 36
Decision: repair-before-submit
- [medium] Citation keys missing after round trip for intro-eq-1: nguyen2025-imaging.
  Task: Preserve citation keys metadata for intro-eq-1 in this format.
- [medium] Comment threads missing after round trip for intro-eq-1: resolve prior sensitivity note.
  Task: Preserve comment threads metadata for intro-eq-1 in this format.
- [high] Equation LaTeX changed for intro-eq-1: expected "p(\\theta | y) \\propto p(y | \\theta)p(\\theta)", got "p(\\theta | y) = p(y | \\theta)p(\\theta)".
  Task: Regenerate the export/import adapter so equation latex survives round trip for intro-eq-1.
- [low] fig-signal source asset changed from figures/signal-panel.svg to figures/signal-panel.pdf.
  Task: Confirm the transcoded figure keeps resolution, accessibility metadata, and citation anchors.
- [high] Table columns missing after round trip for table-cohorts: median_age.
  Task: Preserve table columns metadata for table-cohorts in this format.

### notebook
Score: 10
Decision: repair-before-submit
- [medium] Unresolved suggestions missing after round trip for intro-eq-1: explain weakly informative prior.
  Task: Preserve unresolved suggestions metadata for intro-eq-1 in this format.
- [medium] Comment threads missing after round trip for fig-signal: confirm color-safe palette.
  Task: Preserve comment threads metadata for fig-signal in this format.
- [high] Notebook output hash changed for cell-harmonize: expected "sha256:cell-output-harmonize", got "sha256:cell-output-stale".
  Task: Regenerate the export/import adapter so notebook output hash survives round trip for cell-harmonize.
- [medium] Execution count changed for cell-harmonize: expected 18, got 12.
  Task: Regenerate the export/import adapter so execution count survives round trip for cell-harmonize.
- [high] notebook round trip lost produces-summary link cell-harmonize -> table-cohorts.
  Task: Preserve cross-reference cell-harmonize -> table-cohorts during notebook import.
- [high] notebook round trip lost shared-cohort link table-cohorts -> fig-signal.
  Task: Preserve cross-reference table-cohorts -> fig-signal during notebook import.

Audit digest: `da45ce37c71f4a4f7ffcaaca096fc93a959517aaee096c7bc15f3346ed557599`
