# Analysis Variable Provenance Assistant

This is a focused AI-Powered Research Assistant Suite slice for SCIBASE issue #16. It audits whether manuscript analysis variables can be traced back to the project data dictionary, producing pipeline transforms, cohort filters, transform hashes, and prior reproducibility attempts.

## Scope

- Checks manuscript variables against data dictionary ids and aliases.
- Detects unit drift between manuscript text and dictionary definitions.
- Checks cohort-filter alignment between manuscript analyses and producing transforms.
- Flags incomplete derived-variable lineage.
- Detects stale transform hashes and failing or non-deterministic pipelines.
- Links failed reproducibility attempts to affected manuscript analyses.
- Emits reviewer-ready findings, priority actions, confidence scores, and stable digests.

It intentionally does not duplicate broad assistant-suite submissions, protocol-trace modules, evidence-grounding checks, statistical methods review, research-gap planners, rebuttal packs, ethics checks, citation-context reconciliation, reporting-guideline compliance, benchmark-leakage audits, or figure/table consistency modules.

## Run

```powershell
node analysis-variable-provenance-assistant/test.js
node analysis-variable-provenance-assistant/demo.js
```

The demo writes:

- `analysis-variable-provenance-assistant/demo-output/provenance-audit.json`
- `analysis-variable-provenance-assistant/demo-output/demo.svg`

This PR also includes the required short MP4 demo artifact:

- `analysis-variable-provenance-assistant/demo-output/demo.mp4`

## API

```js
const {
  auditVariableProvenance,
  buildReviewerReport,
  createFindingDigest,
} = require("./analysis-variable-provenance-assistant");

const audit = auditVariableProvenance({
  manuscript,
  dataDictionary,
  pipelines,
  reproducibilityAttempts,
});
```

`auditVariableProvenance` returns analysis-level packets with flags, findings, reviewer actions, reproducibility confidence, and deterministic finding digests.
