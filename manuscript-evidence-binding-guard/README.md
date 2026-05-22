# Manuscript Evidence Binding Guard

This module adds a focused release guard for the real-time collaborative research editor. It verifies that publication-ready claims, figures, tables, and equations are bound to current evidence before a collaborative manuscript is exported for submission.

The guard is intentionally distinct from broad editor foundations, operation replay, offline conflict handling, reference formatting, authorship approval, freeze lanes, figure/table review, task dependency checks, notebook kernel leases, presence privacy, and accessibility parity work. It answers a narrower reviewer question: can every release claim and asset be traced to locked, current, cited evidence?

## What It Checks

- Claims have all required evidence types, such as notebook outputs, datasets, and method citations.
- Evidence anchors exist, are locked, and were approved for the release.
- Current output digests still match the approved output digest.
- Dataset/code/notebook upstream digests still match the approved source digests.
- Section version hashes still match the evidence binding.
- Cited DOI or citation keys are attached to the supporting evidence.
- Figures, tables, and equations have source anchors that are still current.

## Run Locally

```bash
npm run check
npm test
npm run demo
npm run video
```

The demo commands write reviewer artifacts to `reports/`:

- `summary.json`
- `evidence-binding-review-packet.md`
- `summary.svg`
- `demo.mp4`

## Reviewer Path

1. Run the tests to confirm stale evidence and missing bindings are blocked.
2. Run the demo to regenerate JSON, Markdown, and SVG artifacts.
3. Run the video command to regenerate the H.264 MP4 walkthrough.
4. Inspect `reports/evidence-binding-review-packet.md` for the release decision and reviewer actions.
5. Use the demo video as the short walkthrough artifact required by the bounty.
