# Endorsement Ring Auditor

This module adds a deterministic, dependency-free endorsement-ring auditor for SCIBASE issue #15. It checks whether reputation events, endorsements, reviewer overlap, and badge awards are safe to apply before user profiles or public reputation summaries trust them.

## Scope

- Reciprocal endorsement windows
- Burst endorsement patterns
- Shared device, recovery, invite, and affiliation signals
- Reviewer overlap for reputation changes
- Missing endorsement evidence
- Badge criteria snapshot checks
- Reputation deltas that outpace independent evidence

All fixtures are synthetic. The module does not access live profiles, private messages, identity providers, device fingerprints, credentials, or external APIs.

## Run

```bash
node community-user-reputation-system/endorsement-ring-auditor/test.js
node community-user-reputation-system/endorsement-ring-auditor/demo.js
node community-user-reputation-system/endorsement-ring-auditor/make-demo-video.js
```

Generated endorsement-ring audit artifacts are written to `reports/`.
