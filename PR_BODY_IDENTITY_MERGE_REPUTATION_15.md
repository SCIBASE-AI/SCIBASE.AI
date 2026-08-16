/claim #15

## Summary

Adds `researcher-identity-merge-guard`, a focused Community & User Reputation System slice for safe researcher profile consolidation before reputation, CRediT-style contribution credit, badges, leaderboards, or private review history can transfer between merged profiles.

The guard evaluates synthetic merge packets for:

- independent verified identity proofs across ORCID, GitHub, and institutional email evidence
- ORCID and GitHub alias conflicts
- stale institutional email evidence
- projected reputation or credit spikes after merge
- open source-profile objection windows
- anonymous, double-blind, or private review history exposure
- missing institutional steward approval
- duplicate publication or contribution-credit collisions
- missing durable audit receipts

## Demo Video

Required short demo video is included at:

`researcher-identity-merge-guard/reports/demo.mp4`

It is a generated synthetic slate only. It does not capture a desktop, browser, credentials, personal files, API keys, or private researcher data.

## Reviewer Artifacts

- `researcher-identity-merge-guard/reports/summary.json`
- `researcher-identity-merge-guard/reports/reviewer-packet.md`
- `researcher-identity-merge-guard/reports/summary.svg`
- `researcher-identity-merge-guard/reports/demo.mp4`

## Validation

```text
npm run check
npm test
npm run demo
npm run video
git diff --check
ffprobe reports/demo.mp4
```

Local results:

- syntax check passed
- tests passed: 5/5
- demo generated 4 packet decisions: approve 1, review 1, hold 2
- MP4 rendered successfully: 1280x720, yuv420p, 8.000000 seconds
- `git diff --check` passed

AI-assisted implementation, reviewed and locally verified before submission.
