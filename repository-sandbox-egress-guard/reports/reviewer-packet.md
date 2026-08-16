# Repository Sandbox Egress Guard Report

Generated: 2026-08-16T14:57:25.834Z
Execution plans analyzed: 4
Decision counts: RELEASE 1, REVIEW_MERGE 1, HOLD_MERGE 2

## Findings

### repo-release-001: Clean climate notebook reproduction

Decision: RELEASE
Pipeline: notebooks/run_analysis.ipynb

- No sandbox egress or containment risk detected.

Recommended actions:
- Allow repository execution, merge, and tagged release with normal provenance.

### repo-hold-002: Model benchmark rerun with open egress and host secrets

Decision: HOLD_MERGE
Pipeline: notebooks/benchmark.ipynb

- MAJOR CONTAINER_IMAGE_NOT_PINNED: The execution container is not pinned by a content digest.
- MAJOR EXECUTION_PROVENANCE_INCOMPLETE: The command hash or dependency lockfile evidence is missing.
- CRITICAL SANDBOX_NETWORK_EGRESS_OPEN: The reproducibility run allows open or wildcard network egress.
- CRITICAL SECRET_ENVIRONMENT_EXPOSED: Secret-like environment variables are available to the repository execution sandbox.
- CRITICAL SECRET_MOUNT_EXPOSED: Host secret paths are mounted into the repository execution sandbox.
- CRITICAL PRIVILEGED_SANDBOX_RUNTIME: The sandbox uses privileged, root, host PID, or host IPC execution settings.
- CRITICAL UNSAFE_HOST_OR_WRITE_MOUNT: The sandbox has unsafe host mounts or writable paths outside declared artifact locations.
- MAJOR RESOURCE_CAPS_MISSING: The execution plan lacks one or more resource caps.
- CRITICAL OUTPUT_PATH_ESCAPES_WORKSPACE: One or more output paths escape declared results or artifacts directories.
- CRITICAL REPOSITORY_RELEASE_NOT_FROZEN_FOR_SANDBOX_RISK: Repository merge or public release remains enabled while sandbox findings are unresolved.

Recommended actions:
- Freeze protected-branch merge, DOI tagging, and public reproducibility badges.
- Attach sandbox findings to the repository review packet.
- Re-run the exact reproducibility pipeline after remediation.
- Preserve reviewer evidence with the tagged release record.

### repo-review-003: Materials simulation with approved package mirror

Decision: REVIEW_MERGE
Pipeline: code/run_simulation.py

- MAJOR EXECUTION_PROVENANCE_INCOMPLETE: The command hash or dependency lockfile evidence is missing.
- MAJOR SANDBOX_NETWORK_ALLOWLIST_REVIEW: The reproducibility run uses limited network egress and needs reviewer approval before merge.

Recommended actions:
- Attach sandbox findings to the repository review packet.
- Re-run the exact reproducibility pipeline after remediation.
- Preserve reviewer evidence with the tagged release record.

### repo-hold-004: Private dataset release with writable home mount

Decision: HOLD_MERGE
Pipeline: code/reproduce.sh

- CRITICAL SECRET_ENVIRONMENT_EXPOSED: Secret-like environment variables are available to the repository execution sandbox.
- CRITICAL PRIVILEGED_SANDBOX_RUNTIME: The sandbox uses privileged, root, host PID, or host IPC execution settings.
- CRITICAL UNSAFE_HOST_OR_WRITE_MOUNT: The sandbox has unsafe host mounts or writable paths outside declared artifact locations.
- CRITICAL REPOSITORY_RELEASE_NOT_FROZEN_FOR_SANDBOX_RISK: Repository merge or public release remains enabled while sandbox findings are unresolved.

Recommended actions:
- Freeze protected-branch merge, DOI tagging, and public reproducibility badges.
- Attach sandbox findings to the repository review packet.
- Re-run the exact reproducibility pipeline after remediation.
- Preserve reviewer evidence with the tagged release record.
