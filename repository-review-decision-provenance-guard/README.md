# Repository Review-Decision Provenance Guard

Self-contained synthetic module for SCIBASE issue #10, Project Repository & Version Control.

The guard focuses on a narrow release/export decision point: resolved merge-request review discussions should not disappear after merge. Before a tagged scientific repository version is exported, the module checks that reviewer decisions are durable, anchored to files and commits, role-appropriate, public-safe, and linked from the export manifest.

## What It Checks

- Stable release tag, export bundle hash, and DOI or persistent identifier evidence.
- A review-decision packet entry in the export manifest.
- Resolved review threads mapped to scientific repository components.
- File and commit anchors for reviewed manuscript, data, code, notebook, and metadata changes.
- Reviewer role eligibility by component.
- Resolution rationales that can survive future audit.
- Export inclusion for resolved decisions.
- Private reviewer notes redacted before public release.
- Evidence references such as rendered manuscripts, data dictionaries, notebook hashes, or DataCite previews.

This is distinct from an unresolved-discussion merge gate. It preserves already-resolved scientific review decisions into release and export evidence.

## Run

```sh
npm run check
npm test
npm run demo
npm run verify-video
```

## Outputs

`npm run demo` writes:

- `reports/clean-audit.json`
- `reports/risky-audit.json`
- `reports/risky-review.md`
- `reports/summary.svg`
- `reports/manifest.json`
- `reports/demo.mp4`

The sample data is synthetic only. The module does not call GitHub, DOI providers, identity systems, payment processors, credentials, private repositories, or external APIs.
