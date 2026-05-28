# Endorsement Ring Audit

Batch: reputation-batch-2026-05-ring
Decision: freeze-reputation-cluster
Risk score: 100
Users: 4
Events: 5
Reputation changes: 1
Audit digest: b6f7307c8ce9bf57

## Findings
- [high] Reciprocal endorsements occurred inside the ring-risk window: user-alpha<->user-beta within 72h via evt-1/evt-2.
  Action: Hold the reputation delta until reviewers validate that the endorsements are independent.
- [high] Reciprocal endorsements occurred inside the ring-risk window: user-beta<->user-alpha within 72h via evt-2/evt-1.
  Action: Hold the reputation delta until reviewers validate that the endorsements are independent.
- [high] Reciprocal endorsements occurred inside the ring-risk window: user-alpha<->user-beta within 72h via evt-5/evt-2.
  Action: Hold the reputation delta until reviewers validate that the endorsements are independent.
- [medium] Endorsement burst exceeds normal review cadence: user-alpha created 4 endorsements within 24h near 2026-05-28T01:00:00Z.
  Action: Rate-limit endorsement impact and ask for evidence on the bursted reputation events.
- [medium] Endorsement burst exceeds normal review cadence: user-alpha created 4 endorsements within 24h near 2026-05-28T04:00:00Z.
  Action: Rate-limit endorsement impact and ask for evidence on the bursted reputation events.
- [medium] Endorsement burst exceeds normal review cadence: user-alpha created 4 endorsements within 24h near 2026-05-28T05:00:00Z.
  Action: Rate-limit endorsement impact and ask for evidence on the bursted reputation events.
- [medium] Endorsement burst exceeds normal review cadence: user-alpha created 4 endorsements within 24h near 2026-05-28T06:00:00Z.
  Action: Rate-limit endorsement impact and ask for evidence on the bursted reputation events.
- [blocker] Endorsement cluster shares too many identity or affiliation signals: 5 endorsement edges share device, recovery, invite, or affiliation signals.
  Action: Freeze the cluster and require manual identity/reputation review before applying scores.
- [high] Reputation change relies on overlapping reviewers: rep-1 overlap ratio=0.67 from 3 reviewer slots.
  Action: Require independent reviewers before applying the reputation or badge delta.
- [medium] Endorsement lacks project evidence: evt-1 has no evidence URL or project contribution ID.
  Action: Keep the endorsement visible as social context only until contribution evidence is attached.
- [medium] Endorsement lacks project evidence: evt-2 has no evidence URL or project contribution ID.
  Action: Keep the endorsement visible as social context only until contribution evidence is attached.
- [medium] Endorsement lacks project evidence: evt-4 has no evidence URL or project contribution ID.
  Action: Keep the endorsement visible as social context only until contribution evidence is attached.
- [medium] Endorsement lacks project evidence: evt-5 has no evidence URL or project contribution ID.
  Action: Keep the endorsement visible as social context only until contribution evidence is attached.
- [high] Badge award lacks criteria snapshot: rep-1 awards trusted-reviewer without criteria evidence.
  Action: Block badge publication until criteria and evidence snapshots are stored.
- [high] Reputation delta outpaces supporting evidence: user-beta gained 55 reputation with few supporting events.
  Action: Cap the daily reputation delta until more independent project evidence is present.

## Safety
- Synthetic reputation events only; no live profiles, private messages, identity providers, device fingerprints, credentials, or external APIs.
