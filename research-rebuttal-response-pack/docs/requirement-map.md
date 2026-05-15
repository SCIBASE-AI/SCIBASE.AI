# Requirement Map

This slice targets SCIBASE issue #16 by adding a focused author rebuttal and revision response pack for the AI-powered research assistant workflow.

## Covered capabilities

- Auto peer-review reports: reviewer findings are converted into response rows with concern topics, response strategy, and editor-facing summaries.
- Reproducibility checks: partial code/dependency evidence creates high-priority evidence requests and unresolved-risk flags.
- Research gap discovery support: scope/generalization concerns create revision tasks that identify underpowered domains and missing evidence.
- Responsible AI assistant behavior: the module is deterministic, credential-free, and uses synthetic local data only.

## Distinction from existing #16 slices

- Not a broad assistant suite.
- Not a protocol trace or evidence-grounding packet.
- Not a reviewer calibration bench.
- Not a redline packet.
- Not a replication planner.

The output is specifically an author-facing rebuttal matrix plus editor-facing resubmission readiness packet.

## Verification

- `npm run check`
- `npm test`
- `npm run demo`
