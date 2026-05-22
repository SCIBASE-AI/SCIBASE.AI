const assert = require("node:assert/strict")
const { evaluatePresenceLiveness } = require("./index")
const { rooms, policy } = require("./sample-data")

const packet = evaluatePresenceLiveness({
  asOf: "2026-05-23T01:20:00.000Z",
  rooms,
  policy,
})

assert.equal(packet.summary.totalRooms, 2)
assert.equal(packet.summary.totalSessions, 8)
assert.equal(packet.summary.publishedSessions, 3)
assert.equal(packet.summary.suppressedSessions, 5)
assert.equal(packet.summary.cleanupActions, 7)
assert.equal(packet.summary.recoveryActions, 1)
assert.equal(packet.summary.fanoutEvents, 3)
assert.equal(packet.summary.holdRooms, 1)
assert.equal(packet.summary.sanitizedRooms, 1)

const alpha = packet.rooms.find((room) => room.roomId === "manuscript-alpha")
assert.equal(alpha.status, "hold_broadcast_cleanup")
assert.deepEqual(alpha.sanitizedPresence.sessions.map((session) => session.sessionId), [
  "sess-ada-active",
  "sess-chen-new-tab",
])

const ghost = alpha.sessionDecisions.find((session) => session.sessionId === "sess-bio-ghost")
assert.equal(ghost.broadcast, false)
assert(ghost.cleanupActions.some((action) => action.code === "ghost_session"))
assert(ghost.cleanupActions.some((action) => action.code === "expired_typing_indicator"))

const reconnect = alpha.sessionDecisions.find((session) => session.sessionId === "sess-dina-reconnect")
assert.equal(reconnect.broadcast, false)
assert.equal(reconnect.recoveryActions[0].code, "reconnect_grace")
assert.equal(reconnect.recoveryActions[0].action, "hold_cursor_restore_marker")

const oldTab = alpha.sessionDecisions.find((session) => session.sessionId === "sess-chen-old-tab")
assert.equal(oldTab.broadcast, false)
assert(oldTab.cleanupActions.some((action) => action.code === "duplicate_tab_shadowed"))

assert(packet.cleanupQueue.some((action) => action.code === "orphan_cursor" && action.sessionId === "missing-session"))

const notebook = packet.rooms.find((room) => room.roomId === "notebook-review")
const expiredLease = notebook.sessionDecisions.find((session) => session.sessionId === "sess-farid-expired-lease")
assert.equal(expiredLease.broadcast, false)
assert(expiredLease.cleanupActions.some((action) => action.code === "expired_presence_fanout_lease"))
assert(expiredLease.cleanupActions.some((action) => action.code === "expired_typing_indicator"))

const skewed = notebook.sessionDecisions.find((session) => session.sessionId === "sess-gita-skew")
assert.equal(skewed.publicStatus, "clock_skew_review")
assert.equal(skewed.publicCursor, null)

const cleanOnly = evaluatePresenceLiveness({
  asOf: "2026-05-23T01:20:00.000Z",
  rooms: [{
    roomId: "clean-room",
    documentId: "doc-clean",
    title: "Clean room",
    sessions: [{
      sessionId: "sess-clean",
      collaboratorId: "clean",
      displayName: "Clean",
      status: "active",
      lastHeartbeatAt: "2026-05-23T01:19:58.000Z",
    }],
    cursors: [{ sessionId: "sess-clean", sectionId: "intro", blockId: "intro-1", offset: 4 }],
    presenceLeases: [{ sessionId: "sess-clean", expiresAt: "2026-05-23T01:20:20.000Z" }],
  }],
  policy,
})
assert.equal(cleanOnly.summary.readyRooms, 1)
assert.equal(cleanOnly.summary.cleanupActions, 0)
assert.equal(cleanOnly.summary.publishedSessions, 1)

const repeated = evaluatePresenceLiveness({
  asOf: "2026-05-23T01:20:00.000Z",
  rooms,
  policy,
})
assert.equal(repeated.audit.digest, packet.audit.digest)

console.log("collaborative presence heartbeat liveness guard tests passed")
