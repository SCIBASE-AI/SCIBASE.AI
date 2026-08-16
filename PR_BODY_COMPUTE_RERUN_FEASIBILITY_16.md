/claim #16

## Summary

Adds `research-compute-rerun-feasibility-guard`, a standalone local package for the AI-Powered Research Assistant Suite.

The guard prevents AI assistant reproducibility language from being released until the project has enough compute-resource evidence for a practical reviewer rerun. It checks hardware specs, RAM/VRAM feasibility, runtime budget, checkpoint/resume evidence, container/lockfile/runtime digests, accelerator determinism, large data-transfer fixture availability, paid cloud/HPC disclosure, and long-run resource notes.

## Demo Video

`research-compute-rerun-feasibility-guard/reports/demo.mp4`

The MP4 is a synthetic FFmpeg-rendered slate. It does not capture a desktop, private data, credentials, real manuscripts, or paid services.

## Validation

From `research-compute-rerun-feasibility-guard`:

- `npm run check`
- `npm test`
- `npm run demo`
- `npm run video`

Repository-level:

- `git diff --check`

## Notes

- No external APIs.
- No paid cloud resources.
- No credentials or private data.
- Synthetic fixtures only.
- Scope is distinct from existing #16 slices around general dependency locks, evidence grounding, external validity, image integrity, statistical/model assumptions, data fabrication, and generic reproducibility attempts. This package specifically gates AI assistant output on practical compute rerun feasibility and resource disclosure.
