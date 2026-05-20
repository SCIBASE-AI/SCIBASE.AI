# Acceptance Notes

This submission implements a distinct AI research assistant milestone: living-literature surveillance for claims that may become stale, contradicted, corrected, or newly supported after a manuscript packet was drafted.

## Acceptance Coverage

- Adds executable assistant logic rather than a static placeholder.
- Supports auto peer-review updates by flagging stale, corrected, retracted, or contradicted evidence.
- Supports reproducibility checks by tracking replication artifacts and failed-replication evidence.
- Supports research-gap discovery by surfacing negative or extension events as opportunities.
- Produces deterministic audit packets and reviewer tasks.
- Uses synthetic data only and has no external API or credential dependency.

## Validation Commands

```bash
node living-literature-surveillance-assistant/test.js
node living-literature-surveillance-assistant/demo.js
node --check living-literature-surveillance-assistant/index.js
node --check living-literature-surveillance-assistant/sample-data.js
node --check living-literature-surveillance-assistant/test.js
node --check living-literature-surveillance-assistant/demo.js
```

The MP4 preview artifact is generated from the same JSON report used by the Markdown and SVG outputs.
