# Research Gap Finder

This prototype implements the Research Gap Finder capability for the AI-powered research assistant suite. It scans synthetic publication metadata, open questions, and lab capabilities to rank concrete research opportunities.

It identifies:

- under-studied topic intersections
- unresolved questions mapped to specific topic clusters
- active topic areas with weak replication coverage
- negative or mixed results that suggest follow-up studies
- opportunities matched to available lab capabilities
- high-momentum areas with recent citation activity

## Run

```sh
node ai-research-assistant/research-gap-finder/test.js
node ai-research-assistant/research-gap-finder/demo.js
node ai-research-assistant/research-gap-finder/make-demo-video.js
```

All fixtures are synthetic. The module performs no patient-data, private manuscript, proprietary corpus, credential, or external API access.
