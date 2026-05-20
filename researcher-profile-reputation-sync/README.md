# Researcher Profile Reputation Sync

Self-contained User & Project Management slice for issue #11. It focuses on a profile governance gap that is different from workspace access ledgers, identity recovery guards, project member lifecycle modules, institutional recertification, anonymous review escrow, and data-room consent ledgers: deciding whether researcher profile, ORCID, affiliation, grant, activity, and reputation data is fresh and safe enough to publish or promote.

The guard evaluates researcher profiles before profile updates, reputation metrics, or public activity feeds are shown to collaborators, institutions, and external readers.

## What It Does

- Checks email verification, ORCID id format, ORCID sync freshness, verified primary affiliation, grant evidence, public/private/anonymous profile modes, activity-feed privacy, citation/download/fork/endorsement metrics, reproducibility score, reputation metric freshness, and anonymous-review identity leakage.
- Produces ready, held, or blocked decisions for each researcher profile.
- Emits deterministic SHA-256 audit digests for both profile decisions and the full sync report.
- Returns reviewer-ready remediation actions for profile governance.

## Files

- `index.js` - dependency-free researcher profile evaluator.
- `test.js` - Node assertion coverage for ready, held, blocked, ORCID, affiliation, grant, privacy, anonymous review, reputation, and deterministic digest paths.
- `demo.js` - terminal demo over synthetic researcher profiles.
- `requirements-map.md` - explicit mapping to issue #11.
- `acceptance-notes.md` - validation notes and limitations.
- `demo.svg` / `demo.mp4` - short visual demo artifacts for bounty review.

## Run

```bash
node researcher-profile-reputation-sync/test.js
node researcher-profile-reputation-sync/demo.js
```

## Example Output

```text
Researcher Profile Reputation Sync Demo
=======================================
profiles: 3
ready: 1, held: 1, blocked: 1
affiliations: 3
grants: 1
activity items: 4
```

## Design Notes

The module is synthetic-data-only and has no network, ORCID, OAuth, SAML, GitHub, Algora, institution, grant-system, or credential integration. It is intended as the deterministic policy layer that can sit in front of real researcher profile publishing, reputation metric refreshes, and activity-feed visibility changes.
