# Acceptance Notes

## Reviewer Path

1. Run `npm run check`.
2. Run `npm test`.
3. Run `npm run demo`.
4. Inspect `reports/summary.json` and `reports/similarity-review-packet.md`.
5. Confirm `reports/summary.svg` and `reports/demo.mp4` exist after artifact generation.

## Expected Demo Outcome

- Overall status is `hold_similarity_review`.
- One introduction passage is held for uncited high similarity.
- One methods passage is clear because it matches a cited standard protocol.
- One discussion passage is marked for self-overlap disclosure.
- One results passage is held for similarity to a retracted source.

## Scope Boundaries

- Uses synthetic data only.
- Does not call external similarity, citation, or corpus APIs.
- Does not implement a full summarizer, citation recommender, or grammar tool.
- Focuses on the peer-review diagnostic similarity layer and its reviewer packet.
