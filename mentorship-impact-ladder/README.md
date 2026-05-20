# Mentorship Impact Ladder

This module is a focused slice for SCIBASE.AI issue #15, Community & User Reputation System.

It evaluates mentor/trainee reputation progression using supervised peer reviews, reproducibility reruns, dataset/code contributions, CRediT roles, independent endorsements, and conflict safeguards. The sample data is synthetic and dependency-free.

## What It Covers

- Mentorship-specific badge tiers such as emerging mentor, trusted mentor, and open science champion.
- Trainee growth credit from supervised reviews, validation work, dataset curation, and project comments.
- Mentor reputation deltas that require independent endorsements and reproducibility-linked evidence.
- Conflict and nepotism safeguards before badge or leaderboard promotion.
- Institution-ready mentorship packets with deterministic digests.
- JSON audit packets, Markdown review packets, SVG summaries, and a short MP4 demo artifact.

## Run

```bash
node mentorship-impact-ladder/test.js
node mentorship-impact-ladder/demo.js
```

Demo output is written to:

- `reports/mentorship-audit.json`
- `reports/institution-packet.md`
- `reports/mentorship-ladder.svg`
- `reports/demo.mp4`
