# Repository Compute Sandbox Policy Guard

This module is a self-contained Project Repository & Version Control slice for SCIBASE.AI issue #10. It evaluates whether a tagged scientific repository release/export candidate is safe to execute in a reproducibility sandbox before merge, DOI publication, or export bundle distribution.

The guard uses synthetic data only. It does not scan real repositories, call external services, use credentials, or process patient/research participant data.

## Scope

- Require digest-pinned sandbox container images.
- Block open or unreviewed network egress during reproducibility replay.
- Enforce CPU, memory, runtime, GPU, and deterministic-seed policy.
- Restrict writable mounts to controlled scratch paths with size limits.
- Require sha256 checkpoints for input manifests, lockfiles, expected artifacts, component manifests, and export bundles.
- Emit deterministic remediation actions for protected merge, export, and DOI publication gates.

## Requirement Mapping

| Issue #10 area | Implementation |
| --- | --- |
| Computation-aware reproducibility | CPU, memory, runtime, GPU, deterministic seed, and container replay checks |
| Container support | Digest-pinned image validation for each pipeline |
| Execution sandboxes | Network egress and writable mount policy checks |
| Hash-based integrity | Component, input, lockfile, artifact, and export bundle sha256 checkpoints |
| Programmatic access & export | Release actions block unsafe export bundles and DOI publication |

## Files

- `index.js` - dependency-free evaluator, report renderer, Markdown renderer, and SVG renderer.
- `sample-data.js` - synthetic ready, blocked, and needs-review repository candidates.
- `test.js` - Node assertion coverage for the gate decisions and report renderers.
- `demo.js` - writes deterministic JSON, Markdown, and SVG reviewer artifacts.
- `scripts/render-demo-video.js` - optional ffmpeg-based MP4 renderer for the reviewer packet.
- `reports/` - generated reviewer artifacts.

## Validation

```bash
npm run check
npm test
npm run demo
```

Optional video render when ffmpeg is available:

```bash
npm run demo:video
```

The included demo artifacts are deterministic and based only on the synthetic fixtures in `sample-data.js`.
