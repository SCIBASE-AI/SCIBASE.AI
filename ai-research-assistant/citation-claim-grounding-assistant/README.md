# Citation Claim Grounding Assistant

This prototype adds a deterministic pre-submission reviewer for the AI-powered research assistant suite. It checks whether manuscript claims are grounded in the cited evidence before authors submit or publish a project.

The assistant reviews synthetic manuscript packets for:

- missing citations on primary, safety, or numeric claims
- cited sources that contradict the manuscript text
- low-relevance citation matches
- non-peer-reviewed support used for central scientific claims
- certainty language that overstates the available evidence
- stale, inaccessible, or clustered citation support
- missing limitations caveats

## Files

- `index.js` contains the reviewer and Markdown renderer.
- `sample-data.js` contains a synthetic manuscript and citation set.
- `test.js` covers contradiction, missing citation, numeric grounding, certainty, and deterministic digest behavior.
- `demo.js` writes JSON, Markdown, and SVG review artifacts.
- `make-demo-video.js` creates a short MP4 summary for bounty review.

## Run

```sh
node ai-research-assistant/citation-claim-grounding-assistant/test.js
node ai-research-assistant/citation-claim-grounding-assistant/demo.js
node ai-research-assistant/citation-claim-grounding-assistant/make-demo-video.js
```

All data is synthetic. The assistant performs no patient-data, private-manuscript, registry, credential, or external API access.
