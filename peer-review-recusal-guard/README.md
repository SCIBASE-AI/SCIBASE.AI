# Peer Review Recusal Guard

This module adds a focused peer-review conflict and recusal gate for the Community & User Reputation System.

It evaluates review assignments before a review is released, credited, or allowed to affect reputation metrics. The guard checks reviewer status, disclosure freshness, recent coauthorship, shared grants, lab and mentor relationships, institution overlap in blind review, and reputation-weighted public impact.

## What it produces

- `allow`, `steward_review`, or `recuse` decisions for each review assignment
- anonymized reviewer labels for blind-review-safe stewardship
- evidence-backed blockers and warnings
- SHA-256 audit digests for assignment packets
- JSON, Markdown, SVG, and MP4 demo artifacts

## Run locally

```bash
npm run check
npm test
npm run demo
npm run video
```

Generated artifacts are written to `reports/`.
