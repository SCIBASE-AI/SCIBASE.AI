# Research Assistant Protocol Trace

Self-contained contribution for SCIBASE issue #16, focused on a protocol-trace and reproducibility-readiness slice of the AI-Powered Research Assistant Suite.

The module helps reviewers answer:

- Are manuscript claims aligned with preregistered protocol commitments?
- Which evidence artifacts and citations support each claim?
- Is the project reproducible enough to release or review?
- Which research gaps follow from the manuscript limitations and user interests?

It is deterministic, dependency-free, credential-free, and uses synthetic sample data only.

## Run

```bash
cd research-assistant-protocol-trace
npm run check
npm test
npm run demo
```

Demo recording: `docs/protocol-trace-demo.mp4`

## What It Includes

- `src/protocol-trace.js` - core scoring, claim tracing, evidence mapping, reproducibility checks, peer-review recommendations, and research-gap ranking.
- `sample-data.json` - synthetic manuscript, protocol, evidence, citation, reproducibility, and corpus fixture.
- `test.js` - Node assertion tests for alignment, release decision, reproducibility regression, and validation errors.
- `demo.js` - CLI reviewer demo that prints the protocol trace packet.
- `docs/requirement-map.md` - direct mapping to issue #16 requirements.

## Design Notes

This is intentionally not a generic LLM wrapper. It models the assistant as an evidence-first deterministic quality gate that can run before a manuscript is released:

- Primary claims without protocol matches are held for revision.
- Claims with weak evidence or missing citations become peer-review findings.
- Reproducibility confidence is computed from concrete artifacts and run history.
- Gap recommendations are ranked from manuscript limitations, researcher interests, replication scarcity, and topic activity.

The result is a reviewer-ready trace packet with an audit digest, so future backend/API work can persist and compare assistant runs.
