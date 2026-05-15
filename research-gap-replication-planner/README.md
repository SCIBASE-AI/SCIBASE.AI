# Research Gap Replication Planner

Self-contained contribution for `SCIBASE-AI/SCIBASE.AI#16`, focused on the boundary between the AI Research Assistant Suite's peer-review, reproducibility, and research-gap capabilities.

This slice is intentionally not another broad assistant demo. It builds a deterministic planner that turns corpus limitations, prior reproducibility attempts, manuscript evidence coverage, and lab capabilities into reviewer-ready replication priorities.

## What It Does

- Generates auto peer-review flags for claim/evidence/citation alignment, statistical risk, and domain-specific omissions.
- Scores project reproducibility readiness from raw data, clean pipelines, environment locks, tests, reported outputs, and previous run attempts.
- Finds under-replicated research intersections with unresolved findings, negative-result signals, and lab-fit evidence.
- Produces a prioritized replication plan with required artifacts, first actions, and a stable audit digest.
- Uses only local synthetic data and Node.js standard library APIs.

## Requirement Map

| Issue #16 requirement | Implementation evidence |
| --- | --- |
| Auto peer review reports | `reviewManuscript` emits structured review findings with severity, category, claim id, and domain-specific template checks. |
| Claims vs. evidence alignment | Claims without evidence, citations, or registered support are flagged before release. |
| Statistical or methodological red flags | Small-sample p-value edge cases, missing controls, and missing domain evidence are detected. |
| Reproducibility checker | `scoreReproducibility` checks required artifacts, prior attempts, environment integrity, and output consistency. |
| Reproducibility confidence score | Each project receives a numeric confidence score plus pass/hold status and remediation actions. |
| Links to previous reproducibility attempts | Prior attempt ids and outcomes are included in each report and used in scoring. |
| Research gap finder | `rankResearchOpportunities` ranks under-replicated topic intersections using unresolved findings, negative signals, replication counts, and corpus activity. |
| User opportunity feed | Lab capabilities and researcher interests shape the replication-priority output. |

See `docs/requirement-map.md` for the detailed checklist.

## Demo

```bash
cd research-gap-replication-planner
npm run demo
```

Expected summary:

```text
Planner status: hold
Top opportunity: alzheimer + crispr + single-cell
Top replication decision: prioritize
Top peer-review flag: Claim has no supporting evidence artifact.
Weak reproducibility project: circadian-metabolomics-2026
Audit hash: de1b1fa44644dc24...
```

Visual demo assets:

- `docs/demo.svg`
- `docs/demo.mp4`

## Verification

```bash
cd research-gap-replication-planner
npm run check
```

Local verification covers:

- opportunity ranking
- peer-review flag generation
- reproducibility scoring
- deterministic audit hash generation
- CLI demo output

## AI-Assisted Disclosure

This contribution was produced with AI assistance and reviewed before submission. It uses no credentials, no live user data, and no external services.
