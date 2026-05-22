# Manuscript Unit Consistency Assistant

Dependency-free AI peer-review aid slice for SCIBASE issue #13.

This module audits draft manuscript packets for unit hygiene risks that slow down scientific peer review:

- numeric values that appear without adjacent units
- the same reagent or outcome reported across incompatible unit families
- table header units that drift from cell-level units
- implausible wet-lab temperature or percentage values
- reviewer-ready actions and deterministic audit digests

The implementation uses synthetic sample data only. It is designed as a small, auditable MVP component that can sit behind an AI-assisted pre-submission review workflow.

## Run

```bash
npm --prefix manuscript-unit-consistency-assistant run check
npm --prefix manuscript-unit-consistency-assistant test
npm --prefix manuscript-unit-consistency-assistant run demo

node manuscript-unit-consistency-assistant/test.js
node manuscript-unit-consistency-assistant/demo.js
node --check manuscript-unit-consistency-assistant/index.js
node --check manuscript-unit-consistency-assistant/sample-data.js
node --check manuscript-unit-consistency-assistant/test.js
node --check manuscript-unit-consistency-assistant/demo.js
```

The demo writes:

- `reports/unit-consistency-report.json`
- `reports/unit-consistency-report.md`
- `reports/unit-consistency-summary.svg`
- `reports/demo-script.txt`

## API

```js
const { analyzeManuscript } = require("./index");

const result = analyzeManuscript({
  manuscriptId: "draft-001",
  title: "Draft title",
  trackedTerms: [{ name: "IL-6", aliases: ["IL-6", "IL6"] }],
  sections: [{ id: "methods", title: "Methods", text: "IL-6 was measured at 180 pg/mL." }],
  tables: [],
});
```

`result` contains a readiness summary, findings, reviewer actions, measurement inventory, and a stable audit digest.
