# Git LFS Pointer Integrity Guard

Self-contained reviewer slice for SCIBASE issue #10, Project Repository & Version Control.

This guard focuses on the Git LFS and hash-based integrity requirement in the project repository spec. It audits large scientific files before a tagged repository release or export bundle is allowed:

- parses canonical Git LFS pointer files
- compares pointer SHA-256 and byte size against large-object storage metadata
- verifies release/export manifest coverage for DOI bundles
- flags missing, stale, malformed, or mismatched large objects
- checks retention and quota risk before release
- emits deterministic release, hold, and remediation actions

The sample data is synthetic and the module does not call GitHub, Git LFS, DOI providers, object stores, payment providers, or external services.

## Files

- `index.js` - audit engine, pointer parser, report renderers
- `sample-data.js` - synthetic repository, manifest, and object-store records
- `test.js` - deterministic regression tests
- `demo.js` - generates JSON, Markdown, and SVG reviewer artifacts
- `render-video.js` - renders the required short MP4 demo
- `reports/` - generated reviewer packet

## Validation

```bash
node lfs-pointer-integrity-guard/test.js
node lfs-pointer-integrity-guard/demo.js
node lfs-pointer-integrity-guard/render-video.js
node --check lfs-pointer-integrity-guard/index.js
node --check lfs-pointer-integrity-guard/sample-data.js
node --check lfs-pointer-integrity-guard/test.js
node --check lfs-pointer-integrity-guard/demo.js
node --check lfs-pointer-integrity-guard/render-video.js
git diff --check
ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt,width,height -show_entries format=duration,size -of default=nw=1 lfs-pointer-integrity-guard/reports/demo.mp4
```

Expected decision for the synthetic fixture is `block-release`: it intentionally includes one passing LFS object plus malformed, missing, checksum-mismatched, size-mismatched, retention, manifest coverage, DOI/export, and quota-risk cases.
