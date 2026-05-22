# Collaborative Presence Heartbeat Liveness Report

Rooms reviewed: 2
Sessions reviewed: 8
Published sessions: 3
Suppressed sessions: 5
Cleanup actions: 7
Recovery actions: 1
Fanout events: 3
Audit digest: `4a2254121a88799219fbeb58149dc0cc31087ce21619de6817fa5963bf7b55ba`

## Room Decisions

### Collaborative manuscript draft
- Status: hold_broadcast_cleanup
- Reviewed sessions: 5
- Published sessions: 2
- Suppressed sessions: 3
- Cleanup codes: ghost_session, expired_typing_indicator, duplicate_tab_shadowed, orphan_cursor
- Recovery codes: reconnect_grace

### Notebook review room
- Status: sanitized_ready
- Reviewed sessions: 3
- Published sessions: 1
- Suppressed sessions: 2
- Cleanup codes: expired_typing_indicator, expired_presence_fanout_lease, future_heartbeat_clock_skew
- Recovery codes: none

## Cleanup Queue
- manuscript-alpha/sess-bio-ghost: ghost_session (critical)
- manuscript-alpha/sess-bio-ghost: expired_typing_indicator (warning)
- manuscript-alpha/sess-chen-old-tab: duplicate_tab_shadowed (warning)
- manuscript-alpha/missing-session: orphan_cursor (warning)
- notebook-review/sess-farid-expired-lease: expired_typing_indicator (warning)
- notebook-review/sess-farid-expired-lease: expired_presence_fanout_lease (warning)
- notebook-review/sess-gita-skew: future_heartbeat_clock_skew (warning)
