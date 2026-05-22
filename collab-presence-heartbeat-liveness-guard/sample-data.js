const policy = {
  version: "presence-heartbeat-liveness-v1",
  heartbeatStaleSeconds: 45,
  ghostSessionSeconds: 120,
  reconnectGraceSeconds: 90,
  typingIndicatorSeconds: 20,
  maxFutureClockSkewSeconds: 10,
  duplicateTabWindowSeconds: 15,
}

const rooms = [
  {
    roomId: "manuscript-alpha",
    documentId: "doc-alpha",
    title: "Collaborative manuscript draft",
    sessions: [
      {
        sessionId: "sess-ada-active",
        collaboratorId: "ada",
        displayName: "Ada",
        status: "active",
        lastHeartbeatAt: "2026-05-23T01:19:45.000Z",
        typingSince: "2026-05-23T01:19:52.000Z",
      },
      {
        sessionId: "sess-bio-ghost",
        collaboratorId: "bianca",
        displayName: "Bianca",
        status: "editing",
        lastHeartbeatAt: "2026-05-23T01:17:15.000Z",
        typingSince: "2026-05-23T01:17:30.000Z",
      },
      {
        sessionId: "sess-chen-old-tab",
        collaboratorId: "chen",
        displayName: "Chen",
        status: "active",
        lastHeartbeatAt: "2026-05-23T01:19:25.000Z",
      },
      {
        sessionId: "sess-chen-new-tab",
        collaboratorId: "chen",
        displayName: "Chen",
        status: "active",
        lastHeartbeatAt: "2026-05-23T01:19:55.000Z",
      },
      {
        sessionId: "sess-dina-reconnect",
        collaboratorId: "dina",
        displayName: "Dina",
        status: "disconnected",
        lastHeartbeatAt: "2026-05-23T01:19:02.000Z",
        disconnectedAt: "2026-05-23T01:19:20.000Z",
      },
    ],
    cursors: [
      { sessionId: "sess-ada-active", sectionId: "intro", blockId: "intro-2", offset: 81 },
      { sessionId: "sess-bio-ghost", sectionId: "methods", blockId: "methods-4", offset: 12 },
      { sessionId: "sess-chen-old-tab", sectionId: "results", blockId: "result-1", offset: 3 },
      { sessionId: "sess-chen-new-tab", sectionId: "results", blockId: "result-2", offset: 33 },
      { sessionId: "missing-session", sectionId: "discussion", blockId: "discussion-1", offset: 7 },
    ],
    presenceLeases: [
      { sessionId: "sess-ada-active", expiresAt: "2026-05-23T01:20:30.000Z" },
      { sessionId: "sess-bio-ghost", expiresAt: "2026-05-23T01:20:05.000Z" },
      { sessionId: "sess-chen-new-tab", expiresAt: "2026-05-23T01:20:25.000Z" },
      { sessionId: "sess-dina-reconnect", expiresAt: "2026-05-23T01:20:15.000Z" },
    ],
  },
  {
    roomId: "notebook-review",
    documentId: "doc-notebook",
    title: "Notebook review room",
    sessions: [
      {
        sessionId: "sess-eli-clean",
        collaboratorId: "eli",
        displayName: "Eli",
        status: "active",
        lastHeartbeatAt: "2026-05-23T01:19:48.000Z",
      },
      {
        sessionId: "sess-farid-expired-lease",
        collaboratorId: "farid",
        displayName: "Farid",
        status: "active",
        lastHeartbeatAt: "2026-05-23T01:19:50.000Z",
        typingSince: "2026-05-23T01:18:55.000Z",
      },
      {
        sessionId: "sess-gita-skew",
        collaboratorId: "gita",
        displayName: "Gita",
        status: "active",
        lastHeartbeatAt: "2026-05-23T01:20:22.000Z",
      },
    ],
    cursors: [
      { sessionId: "sess-eli-clean", sectionId: "analysis", blockId: "cell-2", offset: 18 },
      { sessionId: "sess-farid-expired-lease", sectionId: "analysis", blockId: "cell-5", offset: 44 },
      { sessionId: "sess-gita-skew", sectionId: "analysis", blockId: "cell-7", offset: 21 },
    ],
    presenceLeases: [
      { sessionId: "sess-eli-clean", expiresAt: "2026-05-23T01:20:25.000Z" },
      { sessionId: "sess-farid-expired-lease", expiresAt: "2026-05-23T01:19:40.000Z" },
      { sessionId: "sess-gita-skew", expiresAt: "2026-05-23T01:20:30.000Z" },
    ],
  },
]

module.exports = {
  policy,
  rooms,
}
