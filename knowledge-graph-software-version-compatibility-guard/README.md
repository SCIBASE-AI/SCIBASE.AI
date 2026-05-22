# Knowledge Graph Software Version Compatibility Guard

Self-contained reviewer module for issue #17, Scientific Knowledge Graph Integration.

The guard evaluates candidate knowledge-graph recommendation paths before they appear in discovery mode or entity-page packets. It checks whether software packages, runtimes, container images, workflow engines, lockfiles, and runtime captures are compatible enough for a researcher to trust and rerun the graph path.

## What It Does

- Blocks unsafe graph recommendations when runtime, package, container, or workflow versions cannot satisfy declared compatibility ranges.
- Keeps compatible paths visible while routing weak provenance, such as missing lockfiles or stale runtime captures, to curator review.
- Produces an entity-page packet with visible paths, suppressed paths, findings, and required curator actions.
- Generates deterministic JSON, Markdown, SVG, and MP4 review artifacts from synthetic fixtures only.

## Files

- `index.js` - dependency-free evaluator and Markdown packet builder.
- `sample-data.js` - synthetic graph scenarios for blocked, review, and visible recommendations.
- `test.js` - Node test coverage for suppression, curator review, and compatible paths.
- `demo.js` - report generator and optional MP4 artifact writer.
- `requirements-map.md` - issue requirement mapping.
- `reports/` - generated reviewer artifacts.

## Run

```bash
node --test knowledge-graph-software-version-compatibility-guard/test.js
FFMPEG_PATH=/path/to/ffmpeg node knowledge-graph-software-version-compatibility-guard/demo.js
```

No package registry, container registry, dataset, credential, external API, or network calls are used.
