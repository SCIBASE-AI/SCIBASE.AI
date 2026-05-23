# Challenge Embargo Release Guard

This reviewer packet evaluates whether post-award scientific bounty release packets can expose winner announcements, datasets, notebooks, and open-source packages without violating active sponsor embargoes, patent/publication holds, NDA release terms, solver public-name consent, funder deadlines, or artifact redaction requirements.

| Challenge | Status | Blockers | Warnings | Held artifacts | Digest |
| --- | --- | ---: | ---: | ---: | --- |
| CH-QUANTUM-HOLD-017 | hold | 10 | 0 | 2 | sha256:77c6a90e7b760e131af0dcce6599c17a070af17d27265d62ee95e9e6bb1ae1d7 |
| CH-BIO-EMBARGO-042 | release_ready | 0 | 0 | 0 | sha256:2d513de043142e565b0bf0bba97f910f50056c20208077053abf2a796cc8120b |

## Reviewer Actions

- CH-QUANTUM-HOLD-017: Keep release packet private until embargo approval or end date.
- CH-QUANTUM-HOLD-017: Collect patent docket and counsel clearance before exposing artifacts.
- CH-QUANTUM-HOLD-017: Wait for manuscript/preprint clearance before public release.
- CH-QUANTUM-HOLD-017: Collect sponsor and solver NDA release approvals.
- CH-QUANTUM-HOLD-017: Use anonymized winner labels until public-name consent exists.
- CH-QUANTUM-HOLD-017: Escalate missed open-science deadline or attach approved exception.
- CH-QUANTUM-HOLD-017: Complete redaction, checksum, and license evidence for held artifacts.

## Scope Boundaries

- Synthetic data only.
- No network calls, credentials, real sponsor documents, or live challenge state.
- Distinct from award transparency: this gate decides whether release artifacts may leave embargoed/private state, not how ranks are explained.
