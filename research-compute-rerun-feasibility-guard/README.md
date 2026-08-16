# Research Compute Rerun Feasibility Guard

This package adds a local release gate for the SCIBASE AI-Powered Research Assistant Suite. It checks whether an AI assistant can safely describe a manuscript or project as practically reproducible before the assistant output reaches authors, reviewers, journals, or funders.

The guard focuses on compute feasibility rather than general dependency locking or claim grounding. It asks whether a reviewer can actually rerun the work with the stated resources, time budget, determinism controls, and cost disclosure.

## What It Checks

- Hardware profile completeness: CPU, RAM, accelerator, and VRAM.
- Dataset working set vs RAM and GPU memory.
- Runtime estimate vs reviewer budget.
- Long-run checkpoint/resume evidence.
- Container, lockfile, runtime, or notebook environment digests.
- Accelerator determinism controls and seed policy.
- Large data transfer and fixture availability.
- Paid cloud or queued HPC requirements and disclosure.
- Resource-impact note for long reruns.

## Release Decisions

- `RELEASE_ASSISTANT_OUTPUT`: the assistant can present the rerun as reviewer-feasible.
- `REVISE_ASSISTANT_OUTPUT`: wording must be softened until missing resource evidence is repaired.
- `HOLD_ASSISTANT_OUTPUT`: the assistant must not endorse reproducibility because the compute plan is materially unsafe.

## Local Demo

```bash
npm run check
npm test
npm run demo
npm run video
```

Generated artifacts:

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All fixtures are synthetic. The package uses no external APIs, paid cloud, credentials, private data, real manuscripts, or desktop capture.

## Why This Fits Issue #16

Issue #16 includes a reproducibility checker as a core AI research assistant capability. A research assistant can mislead reviewers if it says a project is reproducible while the rerun secretly requires unavailable GPUs, huge memory, long queues, paid cloud resources, or nondeterministic accelerator settings.

This guard adds a practical compute/resource release gate so the assistant can distinguish a reviewer-feasible rerun from an overclaimed reproducibility endorsement.
