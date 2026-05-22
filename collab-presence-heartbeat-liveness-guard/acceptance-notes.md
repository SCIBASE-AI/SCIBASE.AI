# Acceptance Notes

The reviewer can verify this slice without accounts, services, or private data.

## Expected Synthetic Result

The demo fixture produces:

- 2 rooms reviewed
- 8 sessions reviewed
- 3 sessions published
- 5 sessions suppressed
- 7 cleanup actions
- 1 reconnect recovery action
- 3 presence fanout events
- 1 room held for broadcast cleanup
- 1 room sanitized and ready

The critical case is `sess-bio-ghost`: its heartbeat is stale while an editing cursor and typing state are still visible. The guard suppresses it and emits cleanup actions before the room fanout can show a ghost collaborator.

## Validation

```bash
npm run check
npm test
npm run demo
```

Optional video metadata check:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration -show_entries format=size,duration -of default=noprint_wrappers=1 reports/demo.mp4
```

## Boundaries

This module does not implement the editor UI, network transport, CRDT/OT operations, section locking, notebook execution, privacy redaction, notification fanout, or release export. It is a deterministic pre-broadcast liveness guard for cursor and presence snapshots.
