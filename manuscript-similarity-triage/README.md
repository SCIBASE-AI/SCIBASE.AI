# Manuscript Similarity Triage

This module implements a focused source-overlap review slice for the peer-review aid requirement in issue #13. It compares manuscript passages with a synthetic source corpus, classifies high-risk overlap, and produces reviewer actions before the draft is shared.

The triage covers:

- uncited high-similarity passages
- cited but overly close paraphrases
- self-overlap without reuse disclosure
- retracted-source overlap
- acceptable cited methods/protocol boilerplate
- deterministic audit digests and reviewer packets

## Commands

```sh
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts to `reports/`:

- `summary.json`
- `similarity-review-packet.md`
- `summary.svg`
- `demo.mp4` after the video generation step used for the PR
