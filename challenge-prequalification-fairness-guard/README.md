# Challenge Prequalification Fairness Guard

This module adds a focused Scientific Bounty System slice for SCIBASE issue #18. It evaluates sponsor-side prequalification rounds before solver teams are accepted or rejected from a challenge.

The guard checks well-formed prequalification packets, challenge identity, strict UTC generated-at audit timestamps, published screening criteria, complete criteria-list evidence, well-formed criteria entries, complete and unique criterion identifiers after trimming, valid criterion weight values and totals, valid pass thresholds, valid reviewer quorum requirements, valid sponsor accept/reject decisions, complete applicant-list and unique applicant identity evidence after trimming, well-formed applicant entries, complete round-level review-list evidence, well-formed review entries, complete reviewer score evidence, valid finite 0-100 reviewer score values, weighted threshold consistency, anonymous-screening requirements, reviewer conflicts, distinct reviewer quorum, missing reviewer identity evidence, duplicate reviewer score evidence, missing, empty, or blank rejection reason evidence, strict UTC appeal windows, premature award-publication metadata, and audit evidence. Conflicted reviewer scores are excluded from threshold scoring while the conflict remains auditable, repeated reviewer identities are deduplicated before quorum or threshold scoring, and malformed top-level packets, missing challenge identities, invalid or calendar-impossible generated-at timestamps, premature winner/result publication fields, missing applicant lists, malformed applicant entries, missing or duplicate applicant identities, missing criteria lists, malformed criteria entries, missing review lists, malformed review entries, missing reviewer identities, invalid sponsor decisions, invalid score values, or invalid appeal-window timestamps are excluded from taking effect until the evidence is completed. Unfair or incomplete screening decisions are held for remediation before challenge access changes.

This remains a prequalification-stage fairness slice. It can block winner/finalist/award-publication fields from contaminating screening packets, but it does not evaluate post-award result publication readiness, payout authorization, embargoes, or named-winner consent.

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

## Outputs

- `reports/prequalification-fairness-packet.json`
- `reports/missing-criterion-id-packet.json`
- `reports/normalized-criterion-id-packet.json`
- `reports/invalid-reviewer-score-packet.json`
- `reports/invalid-reviewer-quorum-packet.json`
- `reports/invalid-sponsor-decision-packet.json`
- `reports/missing-applicant-identity-packet.json`
- `reports/duplicate-applicant-identity-packet.json`
- `reports/missing-review-list-packet.json`
- `reports/malformed-review-entry-packet.json`
- `reports/missing-criteria-list-packet.json`
- `reports/malformed-criterion-entry-packet.json`
- `reports/missing-applicant-list-packet.json`
- `reports/malformed-prequalification-round-packet.json`
- `reports/missing-challenge-identity-packet.json`
- `reports/invalid-generated-at-packet.json`
- `reports/impossible-generated-at-packet.json`
- `reports/malformed-applicant-entry-packet.json`
- `reports/blank-rejection-reason-packet.json`
- `reports/impossible-appeal-window-packet.json`
- `reports/prequalification-fairness-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call payment processors, identity providers, private workspaces, sponsor systems, solver accounts, or external APIs.
