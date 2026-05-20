# Requirements Map

Source: SCIBASE.AI issue #15, Community & User Reputation System.

| Requirement | Implementation |
| --- | --- |
| Peer reviews and comments | Supervised peer reviews and inline review comments are mentorship evidence inputs. |
| Review history on profiles | Pair reports emit mentor and trainee progression deltas for profile timelines. |
| Contributor credits | Evidence records carry CRediT-style roles such as review, validation, software, data-curation, and supervision. |
| Visible credit on researcher profiles | `institutionPacket` provides profile-safe mentorship credit summaries and digests. |
| CRediT taxonomy support | `creditedRoles` are normalized and scored through role weights. |
| Transparent reputation metrics | Scores are built from quality, role coverage, endorsements, reproducibility, visibility, and mentor baseline reputation. |
| Badges and incentive tiers | The ladder emits emerging mentor, trusted mentor, open science champion, and moderator-review tiers. |
| Abuse resistance | Relationship conflicts, missing trainee acknowledgement, missing endorsements, and missing reproducibility evidence create moderator or repair tasks. |
| Institutional reporting | Markdown packets and deterministic packet digests support promotion and mentorship reporting. |
| Reviewer-facing artifacts | Demo emits JSON, Markdown, SVG, and MP4 artifacts under `reports/`. |
| Local verification | `test.js` covers tier assignment, conflict safeguards, trainee acknowledgement, reproducibility requirements, digest stability, Markdown output, and SVG output. |
