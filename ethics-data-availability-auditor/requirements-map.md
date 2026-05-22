# Requirements Map

## AI Paper Summarizer

- Produces an audit digest that can be attached to summary-ready checks before sending a draft to collaborators, funders, or editors.
- Keeps the summarizer honest by blocking "ready" status when evidence-bearing claims lack dataset or code artifacts.

## AI Peer Review Aid

- Checks ethics approval and consent disclosure.
- Checks data availability, code availability, and controlled-access wording.
- Flags missing evidence links and private datasets without release terms.
- Emits reviewer-ready tasks rather than opaque scores.

## AI Citation Tool

- Uses evidence and artifact metadata to identify where dataset/code citations or repository links are missing.
- Supports citation insertion planning by naming the artifact that needs a repository, archive, or access statement.

## Verification

- `npm run check`
- `npm test`
- `npm run demo`
- inspect `reports/summary.json`, `reports/reviewer-packet.md`, and `reports/summary.svg`
