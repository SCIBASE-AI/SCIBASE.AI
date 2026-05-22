# Profile Credit Consent Visibility Guard

As of: 2026-05-22T12:00:00.000Z
Audit digest: `41de587fb911104fbd7898f0df8a48b004d188bf0c48b4084c8362c67143a6b5`

## Totals

- Credits evaluated: 7
- Publishable reputation delta: 17
- citation_only: 1
- hold: 2
- institutional_only: 1
- publishable: 2
- redacted: 1

## Credit Decisions

### credit-dataset-curation

- Researcher: Ada Chen (researcher-ada)
- Role: Data curation
- Status: publishable
- Visibility decision: public_profile_and_citation
- Publishable reputation delta: 12
- Reasons: contributor consent is active; identity is verified; evidence receipts are immutable and public-safe
- Actions: Publish credit on profile and citation page; Apply reputation delta to transparent profile ledger; Attach audit digest to profile update packet

### credit-open-review

- Researcher: Ada Chen (researcher-ada)
- Role: Reviewing
- Status: publishable
- Visibility decision: public_profile_and_citation
- Publishable reputation delta: 5
- Reasons: contributor consent is active; identity is verified; evidence receipts are immutable and public-safe
- Actions: Publish credit on profile and citation page; Apply reputation delta to transparent profile ledger; Attach audit digest to profile update packet

### credit-double-blind-review

- Researcher: Blind Reviewer 7 (researcher-blind-reviewer)
- Role: Reviewing
- Status: redacted
- Visibility decision: anonymous_until_release
- Publishable reputation delta: 0
- Reasons: double-blind review remains inside anonymous visibility window
- Actions: Publish only anonymized review receipt; Hold profile and leaderboard reputation delta until anonymity release; Re-evaluate after 2026-08-01T00:00:00.000Z

### credit-embargoed-code

- Researcher: Bea Laurent (researcher-bea)
- Role: Software
- Status: citation_only
- Visibility decision: embargoed_credit
- Publishable reputation delta: 0
- Reasons: linked artifact is still under embargo
- Actions: Show citation-page placeholder only; Suppress public profile delta until embargo expires; Re-evaluate after 2026-07-15T00:00:00.000Z

### credit-revoked-consent

- Researcher: Cy Morgan (researcher-cy)
- Role: Software
- Status: hold
- Visibility decision: do_not_publish
- Publishable reputation delta: 0
- Reasons: profile credit consent has been revoked
- Actions: Remove credit from public profile surfaces; Retain private audit receipt only; Ask contributor to refresh consent in account settings

### credit-private-protocol

- Researcher: Dev Imani (researcher-dev)
- Role: Methodology
- Status: institutional_only
- Visibility decision: restricted_export_only
- Publishable reputation delta: 0
- Reasons: credit evidence is restricted to institutional export
- Actions: Exclude from public profile and citation page; Include in institutional report with restricted evidence label; Require steward approval before public conversion

### credit-missing-evidence

- Researcher: Eli Novak (researcher-eli)
- Role: Supervision
- Status: hold
- Visibility decision: evidence_review
- Publishable reputation delta: 0
- Reasons: credit has no evidence receipt ids; source receipt is not immutable
- Actions: Block reputation delta from profile and leaderboard; Attach missing evidence before publication; Route credit receipt to steward review
