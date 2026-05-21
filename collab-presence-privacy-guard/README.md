# Collaborative Presence Privacy Guard

This module is a focused Real-Time Collaborative Editor slice for issue #12. It validates live cursor and user-presence broadcasts before they are sent to collaborators, so private sections, embargoed notebook cells, anonymous reviewer identities, and locked dataset areas are not leaked through real-time UI metadata.

The guard checks:

- viewer role and section access before broadcasting cursor anchors
- anonymous reviewer masking
- private, embargoed, and locked section title redaction
- restricted collaborator location suppression
- stale presence sessions
- sanitized room snapshots for live presence sidebars

It uses only Node.js built-ins and synthetic data.

## Run

```bash
node collab-presence-privacy-guard/test.js
node collab-presence-privacy-guard/demo.js
```

The demo writes reviewer artifacts to `collab-presence-privacy-guard/reports/`.
