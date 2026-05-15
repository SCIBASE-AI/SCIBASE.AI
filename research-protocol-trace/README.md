# Research Protocol Trace

This is a focused AI research assistant module for SCIBASE issue #16. It turns a study package into a deterministic pre-submission trace report that helps reviewers and authors compare manuscript claims against a registered protocol, evidence artifacts, and reproducibility runs.

The slice is intentionally narrower than a broad peer-review assistant. It focuses on protocol/preregistration consistency, selective-reporting risk, evidence traceability, and reviewer-ready follow-up actions.

## What It Does

- Maps manuscript claims to registered primary and secondary outcomes.
- Checks whether each claim uses a planned analysis or a post-hoc/unregistered analysis.
- Scores evidence coverage across raw data, notebooks, figures, and tables.
- Flags selective-reporting signals such as unreported primary outcomes, threshold-adjacent p-values, missing citations, and underpowered exploratory claims.
- Builds a reproducibility runbook from environment locks, seeds, dependency manifests, and execution records.
- Produces research-gap opportunity cards from missing registered outcomes and exploratory claims.
- Emits a stable digest so reviewers can verify that a submitted report matches the reviewed study package.

## Files

- `src/protocol-trace.js` - deterministic trace engine.
- `data/sample-study.json` - sample study package with registered protocol, claims, artifacts, and reproducibility metadata.
- `test/protocol-trace.test.js` - dependency-free assertions for protocol mapping, selective-reporting risk, stable digests, and degradation behavior.
- `scripts/demo.js` - local CLI demo.
- `docs/requirement-map.md` - mapping to issue #16 requirements.
- `docs/demo.svg` and `docs/demo.mp4` - short visual demo artifacts.

## Run

```bash
npm run check
npm test
npm run demo
```

Expected demo output includes the protocol trace score, registered protocol id, traced claim count, selective-reporting status, top reviewer action, top research gap, and stable digest.

## Scope Notes

The implementation is credential-free and dependency-free. It does not call an LLM or external scientific API; the goal is to provide a reliable local review primitive that can be embedded into a larger AI assistant workflow later.
