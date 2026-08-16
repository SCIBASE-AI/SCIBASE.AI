# Research Compute Rerun Feasibility Guard

Generated: 2026-08-16T19:40:17.361Z

This packet is a local synthetic demonstration for SCIBASE issue #16. It checks whether an AI-powered research assistant should release reproducibility language before the compute plan is practically rerunnable by a reviewer.

| Packet | Release gate | Score | Working set | Top findings |
| --- | --- | ---: | ---: | --- |
| paper-cpu-fixture-pass | RELEASE_ASSISTANT_OUTPUT | 100 | 2.16 GB | None |
| paper-gpu-overclaim-hold | HOLD_ASSISTANT_OUTPUT | 0 | 1056 GB | CONTAINER_OR_LOCKFILE_MISSING (high); DATASET_MEMORY_EXCEEDS_NODE (critical); GPU_VRAM_FEASIBILITY_GAP (high) |
| paper-hpc-revise | REVISE_ASSISTANT_OUTPUT | 40 | 48 GB | RUNTIME_BUDGET_UNREALISTIC (medium); CLOUD_OR_HPC_COST_UNDISCLOSED (high); RESOURCE_IMPACT_NOTE_MISSING (low) |
| paper-vram-fixture-needed | HOLD_ASSISTANT_OUTPUT | 0 | 109.2 GB | GPU_VRAM_FEASIBILITY_GAP (high); RUNTIME_BUDGET_UNREALISTIC (medium); CHECKPOINT_RESUME_MISSING (high) |

## Release Policy

- `RELEASE_ASSISTANT_OUTPUT`: the assistant can present the rerun as reviewer-feasible.
- `REVISE_ASSISTANT_OUTPUT`: assistant wording must be softened until missing resource evidence is repaired.
- `HOLD_ASSISTANT_OUTPUT`: the assistant must not endorse reproducibility because compute feasibility is materially unsafe.

No external API, private data, paid cloud, real manuscript, or user desktop capture is used.
