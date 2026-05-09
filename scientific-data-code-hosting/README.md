# Scientific Data & Code Hosting

This module is a self-contained implementation for SCIBASE.AI issue #14. It models structured storage, metadata standards, FAIR compliance, upload versioning, artifact previews, executable environments, and compute triggers for reproducible scientific data/code hosting.

## What It Covers

- Storage manifest for datasets, metadata, code, notebooks, figures, models, and raw instrument output.
- Folder-based organization for `data/`, `code/`, `results/`, and `raw/`.
- Metadata-aware previews for CSV tables, notebooks, code, figures, and binary/model artifacts.
- Upload versioning and dataset diffing.
- JSON-LD, DataCite, and schema.org-style metadata.
- FAIR compliance flags for findability, accessibility, interoperability, and reusability.
- Scientific tagging for keywords, instruments, organisms, and variables.
- Docker/Kubernetes-style executable environments for Python, R, and Julia stacks.
- Sandboxed analysis execution and manual/cron compute triggers.

## Run Locally

```bash
cd scientific-data-code-hosting
npm test
npm start
```

Then open `http://localhost:4133`.

## API Surface

- `GET /api/dashboard`
- `GET /api/storage/manifest`
- `GET /api/metadata`
- `GET /api/execute?environment=env-python`

## Requirement Mapping

- Scalable storage engine: implemented by `buildStorageManifest`.
- Major file types and folder organization: represented in `artifactStore.folders` and `artifactStore.artifacts`.
- Metadata-aware previews: implemented by `buildPreview`.
- Upload versioning and diffing: implemented by `versions` and `diffDatasetVersions`.
- JSON-LD, DataCite, schema.org, and FAIR: implemented by `buildMetadataBundle`.
- Tagging system: returned in metadata tags and artifact tags.
- Executable environments: represented by Docker/Kubernetes environment definitions.
- Sandboxed execution and compute triggers: implemented by `runExecutableEnvironment` and dashboard trigger metadata.

## Verification

```bash
npm test
node src/server.js
```

Optional smoke checks:

```bash
curl -s http://localhost:4133/api/dashboard
curl -s http://localhost:4133/api/storage/manifest
curl -s "http://localhost:4133/api/execute?environment=env-python"
```

Demo artifacts are committed under `docs/demo/`, including `dashboard.png` and `scientific-data-code-hosting-demo.mp4`.
