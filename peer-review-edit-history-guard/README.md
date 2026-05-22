# Peer Review Edit History Guard

This module is a focused slice for SCIBASE.AI issue #15. It evaluates structured peer-review and inline-comment edit histories before reputation scores, badges, leaderboards, or project timelines are updated.

The implementation is dependency-free, deterministic, and uses synthetic fixture data only. It does not call external reputation systems, user services, model APIs, or network services.

## What It Checks

- Review edits outside the allowed edit window.
- Score jumps that exceed steward-review thresholds.
- Edits after an author response that should not silently mutate reputation.
- Non-reviewer edits to reviewer-authored comments.
- Identity leaks in anonymous, semi-private, or double-blind review updates.
- Missing edit reasons for reputation-impacting review versions.
- Immutable review-version digests for reviewer-safe audit receipts.

## Issue #15 Mapping

- Peer Reviews & Comments: protects structured review and inline-comment histories.
- Review history tracked on profiles and project timelines: chooses the trusted version for timeline publication.
- Contributor Credits and reputation scoring: freezes or routes reputation deltas when edit history is unsafe.
- Badges and leaderboards: blocks unsafe post-publication edits from silently changing public reputation state.
- Abuse-resistant trust layer: detects score tampering, identity leaks, and non-reviewer mutations.

## Usage

```bash
npm run check
npm test
npm run demo
```

The demo writes:

- `reports/edit-history-packet.json`
- `reports/edit-history-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

## Safety Notes

- Synthetic review metadata only.
- No credentials, private data, API keys, payment data, or wallet material.
- No live users, profiles, reputation systems, or external services.
- No external network calls.
