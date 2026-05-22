# Collaborative Presence Heartbeat Liveness Guard

This module adds a focused Real-Time Collaborative Editor slice for issue #12: heartbeat-based cleanup before live cursor and user-presence fanout.

It evaluates synthetic collaboration rooms for:

- stale heartbeats
- ghost sessions that still show cursors or editing state
- reconnect-grace sessions that should keep restore state but not broadcast cursors
- duplicate collaborator tabs
- orphaned cursors without a session record
- expired typing indicators
- expired presence fanout leases
- future heartbeat clock skew

The output is a sanitized presence snapshot plus cleanup, recovery, and fanout queues. The module is dependency-free and uses synthetic data only. It does not call live editor transports, identity services, notebook kernels, storage providers, notification systems, or external APIs.

## Run

```bash
npm run check
npm test
npm run demo
```

`npm run demo` writes reviewer artifacts under `reports/`:

- `presence-liveness-packet.json`
- `presence-liveness-report.md`
- `summary.svg`
- `demo.mp4`

## Scope

This is intentionally separate from presence privacy, notification visibility, notebook kernel leases, lock/checkpoint recovery, autosave recovery, broad editor foundations, and release/export guards. It handles the liveness decision immediately before a presence room publishes cursor and activity snapshots.
