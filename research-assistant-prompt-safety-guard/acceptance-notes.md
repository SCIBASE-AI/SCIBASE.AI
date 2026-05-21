# Acceptance Notes

This PR is designed as a narrow, reviewable slice for issue #16 rather than a broad research-assistant clone.

## Distinctness

The scope is prompt-injection and assistant-output safety for AI peer-review packets. It avoids duplicating previous issue #16 submissions around:

- broad assistant suites
- evidence or protocol trace modules
- statistics review
- research-gap replication planning
- rebuttal packs
- ethics/data availability
- citation-context reconciliation
- benchmark leakage
- figure/table consistency
- analysis-variable provenance
- domain review templates
- grant fit
- limitations disclosure
- uncertainty calibration
- supplement readiness

## Verification

Expected local checks:

```bash
node research-assistant-prompt-safety-guard/test.js
node research-assistant-prompt-safety-guard/demo.js
node --check research-assistant-prompt-safety-guard/index.js research-assistant-prompt-safety-guard/sample-data.js research-assistant-prompt-safety-guard/test.js research-assistant-prompt-safety-guard/demo.js
git diff --check
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 research-assistant-prompt-safety-guard/reports/demo.mp4
```

## Safety

The module is synthetic-data-only and does not execute model output, shell commands from manuscript text, network requests, or credential reads.
