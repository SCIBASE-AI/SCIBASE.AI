# Chunk Manifest Assembly Gate

This slice supports issue #14, Scientific/Engineering Data & Code Hosting. It
validates large dataset upload manifests before a file is accepted into a
scientific repository, focusing on whether uploaded chunks can be assembled into
the exact declared artifact.

The module uses synthetic upload manifests only. It does not read real datasets,
touch object storage, connect to a cloud provider, or store credentials.

## Checks

- Chunks must cover the full declared byte range without gaps.
- Chunks must not overlap.
- Chunk digests must match the manifest registry.
- The assembled byte count must equal the declared file size.
- Every manifest must include a final artifact digest before release.
- Clean manifests produce deterministic reviewer receipts.

## Local Verification

```bash
node scientific-data-code-hosting/chunk-manifest-assembly-gate/test.js
node scientific-data-code-hosting/chunk-manifest-assembly-gate/demo.js
git diff --check
```

The demo writes deterministic artifacts under
`scientific-data-code-hosting/chunk-manifest-assembly-gate/artifacts/`.

## Files

- `gate.js` - chunk range, digest, and assembly checks.
- `data/manifests.json` - synthetic large-file upload manifests.
- `test.js` - Node built-in tests.
- `demo.js` - deterministic JSON, Markdown, and SVG artifact generation.
