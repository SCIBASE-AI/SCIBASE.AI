# Recommendation Path Auditor

This prototype audits AI research recommendations and graph navigation paths for the Scientific Knowledge Graph.

It checks synthetic graph recommendation packets for:

- private or embargoed node leaks in recommendation paths
- broken explanation paths that cannot be reconstructed from graph edges
- user filter violations before ranking
- retracted or blocked evidence used in paths
- weak evidence scores
- stale trend features
- duplicate recommendations across surfaces
- missing schema.org-compatible node metadata
- missing user-facing personalization reasons and feature weights

## Run

```sh
node scientific-knowledge-graph/recommendation-path-auditor/test.js
node scientific-knowledge-graph/recommendation-path-auditor/demo.js
node scientific-knowledge-graph/recommendation-path-auditor/make-demo-video.js
```

All fixtures are synthetic. The module performs no private graph, account, digest email, credential, ontology-service, or external API access.
