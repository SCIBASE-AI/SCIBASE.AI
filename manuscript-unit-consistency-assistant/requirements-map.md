# Requirements Map

Issue #13 asks for AI-assisted research tools at MVP level. This slice maps to the AI Peer Review Aid requirement.

## AI Peer Review Aid

- Instant diagnostic report on draft manuscripts: `analyzeManuscript` emits findings, severity, evidence snippets, and reviewer actions.
- Technical issue detection: the module checks unit omissions, incompatible unit families, table/header drift, and implausible lab values.
- Domain-specific review templates: `trackedTerms` lets a workflow define manuscript-specific reagents, outcomes, or assay names.
- Pre-review quality check: readiness score and blocking actions identify issues to fix before submission.

## AI Paper Summarizer Support

- The report includes a compact measurement inventory and audit digest that can be included in a paper summary or collaborator handoff.

## AI Citation Tool Support

- Conversion-note recommendations identify places where authors may need to cite a protocol, molecular-weight conversion source, or assay documentation.

## Non-overlap

This is not a knowledge graph measurement harmonization guard, analysis variable provenance audit, citation metadata checker, citation style normalizer, similarity detector, ethics/data availability audit, uncertainty calibration check, or broad manuscript grammar pass. It focuses only on manuscript unit consistency and reviewer action generation.
