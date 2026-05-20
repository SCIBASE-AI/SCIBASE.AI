# Acceptance Notes

## What This Adds

- Dependency-free Node.js module under `analysis-variable-provenance-assistant/`.
- Deterministic analysis provenance audit packets for manuscript variables.
- Tests for undefined variables, unit drift, incomplete lineage, stale transform hashes, non-deterministic pipelines, failed reproducibility links, suite-level reporting, and stable digests.
- Demo JSON, SVG, and MP4 artifacts for bounty review.

## Verification

Use these commands from the repository root:

```powershell
node analysis-variable-provenance-assistant/test.js
node analysis-variable-provenance-assistant/demo.js
node --check analysis-variable-provenance-assistant/index.js
node --check analysis-variable-provenance-assistant/test.js
node --check analysis-variable-provenance-assistant/demo.js
node --check analysis-variable-provenance-assistant/sample-data.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 analysis-variable-provenance-assistant/demo-output/demo.mp4
git diff --check
```

## AI Assistance Disclosure

This contribution was prepared with AI assistance from OpenAI Codex and reviewed through local deterministic tests and artifact checks before submission.
