# Scientific Artifact Provenance Chain

This module adds a dependency-free provenance receipt builder for scientific data and code hosting. It gives reviewers a deterministic way to prove which datasets, code files, environments, and outputs belong to a reproducible research package.

## What It Covers

- Content-hashed artifact manifests for datasets, code, figures, models, supplements, and runtime environments.
- Metadata-aware previews for tabular data and source files.
- Dataset/code version diffs with hash, size, line, and metadata change signals.
- PROV-like activity chains that connect raw inputs, analysis commands, environments, and generated outputs.
- FAIR scoring and validation warnings for missing license, metadata, runtime, or provenance references.
- JSON-LD and DataCite-style exports for machine discovery and DOI registration workflows.
- Rerun plans that tell reviewers which commands and environments are ready to execute.

## Usage

```bash
node scientific-artifact-provenance-chain/test.js
node scientific-artifact-provenance-chain/demo.js
```

```js
const {
  buildProvenanceReceipt,
  validateProvenanceReceipt,
  exportJsonLd,
} = require("./index");

const receipt = buildProvenanceReceipt({
  projectId: "scibase:project:enzyme-kinetics",
  title: "Enzyme kinetics reproducibility bundle",
  doi: "10.5555/scibase.enzyme.2026",
  license: "CC-BY-4.0",
  creators: ["Researcher"],
  artifacts: [
    {
      path: "data/raw/assay.csv",
      content: "sample,rate\nA,1.2\n",
      license: "CC-BY-4.0",
      metadata: { variables: ["sample", "rate"] },
    },
  ],
  activities: [],
});

console.log(validateProvenanceReceipt(receipt));
console.log(exportJsonLd(receipt));
```

## Requirement Mapping

| Issue #14 requirement | Implementation |
| --- | --- |
| Store datasets, code, models, figures, and supplementary files | `makeArtifactRecord()` classifies supported artifact types and records path, role, size, hash, license, and metadata. |
| Folder organization and versioning | Artifact paths are normalized as project-relative paths; `compareArtifactVersions()` produces deterministic version diffs. |
| Metadata-aware previews | CSV/TSV previews expose columns and line counts; code previews expose language and line counts. |
| JSON-LD, DataCite, schema.org | `exportJsonLd()` and `exportDataCite()` produce machine-readable metadata payloads. |
| FAIR compliance | `scoreFair()` and `validateProvenanceReceipt()` check findability, accessibility, interoperability, and reusability signals. |
| Executable environments and reruns | Activities include commands and environment references; `buildRerunPlan()` reports reviewer-ready execution steps. |
| Reproducibility review | Provenance validation detects missing references, unlicensed artifacts, missing runtime metadata, and derived artifacts without generation activity. |

## Design Notes

The module stores only content hashes and caller-provided content in memory for deterministic tests. It does not read arbitrary local files, execute commands, call external services, or require credentials. That makes it safe to run in CI and suitable as a foundation for a future upload/API layer.