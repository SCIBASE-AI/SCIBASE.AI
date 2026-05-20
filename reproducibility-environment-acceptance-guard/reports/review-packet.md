# Reproducibility Environment Acceptance Guard

Context: Scientific Bounty System
Status: needs-review

## Held Items
- env-b: missing lockfile, missing deterministic seed, missing hardware notes, rerun did not pass, dependency risk too high
- env-c: missing hardware notes

## Reviewer Actions
- env-b: Require lockfile or container digest before acceptance.
- env-b: Add deterministic seed and rerun notes.
- env-b: Document CPU/GPU/runtime assumptions.
- env-b: Block acceptance until independent rerun passes.
- env-b: Pin or replace high-risk dependencies.
- env-c: Document CPU/GPU/runtime assumptions.

