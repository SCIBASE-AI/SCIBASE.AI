# Requirement Map

| Issue #14 requirement | Implementation |
| --- | --- |
| Major scientific file types | `detectArtifactType` classifies datasets, code, notebooks, images, video, models, and instrument output. |
| Metadata-aware previews | `buildPreviewSummary` returns compact preview hints for each artifact. |
| Upload versioning and diffing | `summarizeVersionChanges` reports changed, added, and removed paths. |
| JSON-LD, DataCite, schema.org | `buildLinkedDataExports` generates deterministic export payloads. |
| FAIR compliance | `scoreFairCompliance` scores findable, accessible, interoperable, and reusable dimensions. |
| Tags and scientific keywords | Metadata validation requires keywords and exposes them in export payloads. |
| Executable environments | `checkExecutionReadiness` validates runtime, environment file, command, and entry artifact. |
| Upload gates | `validateArtifactManifest` returns accepted, warning, or blocked decisions with blockers. |

## Verification

```bash
npm test
npm run demo
```
