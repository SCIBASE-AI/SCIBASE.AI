# Project Archive Handoff Guard

This module covers the project-space archive and ownership-handoff part of SCIBASE issue #11.

It evaluates whether a scientific workspace can be archived without losing accountability, access-control safety, or citation provenance. The guard is intentionally self-contained so it can be reviewed without any private payment, account, or runtime context.

## What It Does

- Verifies the requester is an active owner or admin.
- Selects a valid internal owner/admin handoff target for the archived project.
- Blocks archive if required manuscript, dataset, or code artifacts lack checksum or owner attribution.
- Revokes external write/download grants that would otherwise survive the archive cutoff.
- Freezes project artifacts into read-only archive mode.
- Emits an audit event and citation snapshot fingerprint for governance review.

## Run

```bash
node project-archive-handoff-guard/test.js
node project-archive-handoff-guard/demo.js
```

## Demo Output

The demo shows a ready archive handoff where an external reviewer download grant is revoked, the internal admin becomes the archive owner, and a citation snapshot/audit event are generated.
