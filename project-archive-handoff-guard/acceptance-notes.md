# Acceptance Notes

## Review Scenarios

1. Ready archive handoff
   - Owner requests archive.
   - Internal admin is selected as handoff owner.
   - External reviewer download access is revoked.
   - Citation snapshot and audit event are produced.

2. Blocked archive
   - Viewer tries to archive the project.
   - External write access remains active and auto-revocation is disabled.
   - The result is blocked with explicit remediation messages.

3. Artifact provenance block
   - Required code artifact is missing a checksum.
   - Archive is blocked because the frozen project would not have verifiable provenance.

## Validation

```bash
node project-archive-handoff-guard/test.js
node project-archive-handoff-guard/demo.js
node --check project-archive-handoff-guard/index.js
node --check project-archive-handoff-guard/test.js
node --check project-archive-handoff-guard/demo.js
```

The included `demo.mp4` is a five-second visual walkthrough of the same archive-handoff flow.
