# Requirements Map

| Issue #14 requirement | Implementation |
| --- | --- |
| Data and code hosting | The release manifest includes datasets, code, models, and supplements. |
| Standards-compliant sharing | `createLicenseCompatibilityPacket()` checks license rules before publication. |
| Open, structured access | Release-ready and blocked artifacts are emitted in structured JSON and Markdown. |
| Reproducible research stack | Missing source URLs block artifacts until provenance is attached. |
| Public artifact distribution | Commercial, redistribution, attribution, and copyleft risks are release-blocking signals. |

## Acceptance notes

- Dependency-free CommonJS module.
- Deterministic sample manifest and tests.
- No credentials, API calls, or network calls.
- Local report artifacts are generated under `reports/`.
