# Acceptance Notes

## What To Review

- `index.js` implements the peer-review civility and evidence gate.
- `sample-data.js` includes synthetic unsafe and clean packets.
- `test.js` validates blocker, redaction, anonymous leak, clean-pass, and report rendering behavior.
- `demo.js` generates the reviewer packet and visual demo artifact.

## Verification

```bash
node review-civility-evidence-gate/test.js
node review-civility-evidence-gate/demo.js
node --check review-civility-evidence-gate/index.js
node --check review-civility-evidence-gate/sample-data.js
node --check review-civility-evidence-gate/test.js
node --check review-civility-evidence-gate/demo.js
git diff --check
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration -of default=noprint_wrappers=1 review-civility-evidence-gate/reports/demo.mp4
```

## Expected Demo Result

The sample packet should return `hold_review_publication` with blockers for harassment, unsupported low-score claims, anonymous reviewer identity leakage, and protected identity disclosure. The clean packet should return `community_ready`.
