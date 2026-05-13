# Scientific Artifact Hosting

Self-contained implementation milestone for [SCIBASE.AI issue #14](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/14).

It models data/code hosting for reproducible science:

- artifact manifests for datasets, code, notebooks, images, videos, models, figures, and raw instrument outputs
- folder organization and upload versioning
- metadata-aware preview selection
- dataset diffing between versions
- JSON-LD, DataCite, and schema.org export payloads
- FAIR compliance checks
- scientific tags for keywords, instruments, organisms, and variables
- executable environments for Docker/Conda/Kubernetes-style runs
- sandboxed run plans and compute triggers
- dependency-free JSON API/demo server

## Run

```bash
cd scientific-artifact-hosting
npm run check
npm test
npm start
```

Open `http://localhost:4332` or inspect:

```bash
curl -s http://localhost:4332/api/manifest
curl -s http://localhost:4332/api/metadata
curl -s http://localhost:4332/api/fair
curl -s http://localhost:4332/api/diff
curl -s http://localhost:4332/api/runtime
curl -s http://localhost:4332/api/triggers
```

## Implementation Notes

The module avoids real storage and compute calls. It makes the hosting contract explicit so later adapters can connect S3, GCS, Git LFS, Docker, Kubernetes, or notebook execution services.

## Files

- `src/artifacts.js` - manifests, previews, diffs, metadata exports, FAIR checks, runtime plans, triggers.
- `src/sample-data.js` - representative artifact versions, metadata, runtime, and trigger fixtures.
- `src/server.js` - local API and reviewer dashboard.
- `test/artifacts.test.js` - Node tests for hosting workflows.
- `docs/requirement-map.md` - direct mapping from issue requirements to implementation evidence.

## Disclosure

Prepared with OpenAI Codex assistance. The implementation and tests were run locally before submission.
