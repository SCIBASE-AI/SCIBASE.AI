# Collaborative Glossary and Acronym Guard

Document: Shared editor glossary draft
Status: HOLD
Fingerprint: 2f92e5168084871a

## Summary

Glossary export is hold with 2 critical, 12 high, and 1 warning finding(s).

## Findings

- CRITICAL ACRONYM_EXPANSION_COLLISION: SNR has multiple approved expansions: signal-to-noise ratio; single nucleus rna.
  - Remediation: Split the acronym by discipline or choose one canonical manuscript-level expansion.
- CRITICAL PRIVATE_TERMINOLOGY_NOTE_LEAK: Glossary entry "SNR" would leak private reviewer or collaborator terminology notes.
  - Remediation: Redact private terminology notes and export only public glossary text.
- HIGH ACRONYM_FIRST_USE_UNEXPANDED: CRISPR first appears in section intro without its expansion.
  - Remediation: Introduce "Clustered Regularly Interspaced Short Palindromic Repeats (CRISPR)" at first use or move the first mention after the definition.
- HIGH ACRONYM_FIRST_USE_UNEXPANDED: SNR first appears in section methods without its expansion.
  - Remediation: Introduce "Signal-to-noise ratio (SNR)" at first use or move the first mention after the definition.
- HIGH ACRONYM_FIRST_USE_UNEXPANDED: SNR first appears in section methods without its expansion.
  - Remediation: Introduce "Single nucleus RNA (SNR)" at first use or move the first mention after the definition.
- HIGH BLOCKING_TERMINOLOGY_COMMENT: Unresolved terminology comment blocks export for batch effect.
  - Remediation: Resolve the terminology comment or mark it non-blocking before export.
- HIGH GLOSSARY_EXPORT_INCOMPLETE: Exportable glossary entry "SNR" is missing from the export glossary manifest.
  - Remediation: Add the entry id to export.includeGlossaryIds or mark it as internal-only.
- HIGH GLOSSARY_EXPORT_INCOMPLETE: Exportable glossary entry "batch effect" is missing from the export glossary manifest.
  - Remediation: Add the entry id to export.includeGlossaryIds or mark it as internal-only.
- HIGH LOCKED_SECTION_TERM_EDIT_UNAPPROVED: Terminology edit edit-locked-snr targets locked section methods without current approval.
  - Remediation: Obtain approval for SNR against section version methods-v8.
- HIGH MENTIONED_TERM_NOT_EXPORTED: "SNR" appears in section methods but is absent from the exported glossary.
  - Remediation: Include the mentioned term in the export glossary or remove the stale manuscript mention.
- HIGH MENTIONED_TERM_NOT_EXPORTED: "batch effect" appears in section intro but is absent from the exported glossary.
  - Remediation: Include the mentioned term in the export glossary or remove the stale manuscript mention.
- HIGH TERM_DEFINITION_INCOMPLETE: Glossary entry "SNR" has an incomplete definition.
  - Remediation: Add a concise, reviewer-ready definition with enough scientific context.
- HIGH TERM_DEFINITION_INCOMPLETE: Glossary entry "batch effect" has an incomplete definition.
  - Remediation: Add a concise, reviewer-ready definition with enough scientific context.
- HIGH UNAPPROVED_GLOSSARY_TERM: Glossary entry "SNR" is exportable but not approved.
  - Remediation: Route the term through collaborator approval or hold it from export.
- WARNING STALE_TERM_SECTION_ANCHOR: Glossary entry "CRISPR" was approved against an older version of section intro.
  - Remediation: Refresh the term anchor against the current section version.

## Export Glossary

- CRISPR - Clustered Regularly Interspaced Short Palindromic Repeats: Genome editing screen technology used by the manuscript collaborators.
- SNR - Signal-to-noise ratio: Image metric.
