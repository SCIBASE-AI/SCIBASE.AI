# Acceptance Notes

## Review Scenarios

1. Current preview reuse
   - Preview kind, artifact hash, upload version, schema version, and metadata digest match the artifact.
   - The result is ready with a stable audit digest.

2. Stale preview regeneration
   - A new artifact version changes the content hash, schema, or metadata snapshot.
   - The result requests preview regeneration and reports dataset column differences.

3. Sensitive preview hold
   - A preview exposes sensitive columns such as participant IDs or email addresses.
   - The result blocks the preview until redaction is complete.

4. FAIR metadata warning
   - Missing license, creator, DOI, or persistent identifier metadata is surfaced before public release.

## Validation

```bash
node artifact-preview-cache-guard/test.js
node artifact-preview-cache-guard/demo.js
node --check artifact-preview-cache-guard/index.js
node --check artifact-preview-cache-guard/test.js
node --check artifact-preview-cache-guard/demo.js
```

The included `demo.mp4` is a five-second visual walkthrough of preview reuse, regeneration, and hold decisions.
