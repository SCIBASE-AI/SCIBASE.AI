# Acceptance Notes

## What This Adds

- Dependency-free Node.js module under `dataset-curation-reuse-credit-ledger/`.
- Deterministic reuse-credit audit packets for curated datasets and code.
- Tests for valid credit allocation, unsafe evidence quarantine, profile-ready reputation summaries, and stable reuse digests.
- Demo JSON, SVG, and MP4 artifacts for bounty review.

## Verification

Use these commands from the repository root:

```powershell
node dataset-curation-reuse-credit-ledger/test.js
node dataset-curation-reuse-credit-ledger/demo.js
node --check dataset-curation-reuse-credit-ledger/index.js
node --check dataset-curation-reuse-credit-ledger/test.js
node --check dataset-curation-reuse-credit-ledger/demo.js
node --check dataset-curation-reuse-credit-ledger/sample-data.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 dataset-curation-reuse-credit-ledger/demo-output/demo.mp4
git diff --check
```

## AI Assistance Disclosure

This contribution was prepared with AI assistance from OpenAI Codex and reviewed through local deterministic tests and artifact checks before submission.
