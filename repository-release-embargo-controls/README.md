# Repository Release Embargo Controls

This module adds a self-contained release readiness gate for access-controlled scientific repositories. It focuses on the part of Project Repository & Version Control where a repository steward needs to decide whether a version can be exported or published.

## What it checks

- Embargo windows before public release
- Restricted component access-policy coverage
- Large scientific artifacts that should be routed through LFS or object-store pointers
- DOI or reserved DOI metadata for citation stability
- Required reproducibility pipeline evidence
- Export bundle completeness for metadata, license, citation, manifest, and checksums
- Rollback snapshot readiness for the parent version
- Deterministic audit digest for review trails

## Run locally

```bash
npm run check
npm test
npm run demo
```

The demo uses `sample-data.json`, which intentionally blocks a public release because the release is still embargoed, a large restricted dataset is not routed through LFS, and the export bundle is missing checksums.
