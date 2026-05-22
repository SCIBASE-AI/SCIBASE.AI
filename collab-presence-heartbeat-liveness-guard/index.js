const crypto = require("node:crypto")

const DEFAULT_POLICY = Object.freeze({
  heartbeatStaleSeconds: 45,
  ghostSessionSeconds: 120,
  reconnectGraceSeconds: 90,
  typingIndicatorSeconds: 20,
  maxFutureClockSkewSeconds: 10,
  duplicateTabWindowSeconds: 15,
})

function evaluatePresenceLiveness(input) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) }
  const asOf = input.asOf || new Date().toISOString()
  const now = Date.parse(asOf)
  const rooms = Array.isArray(input.rooms) ? input.rooms : []
  const roomDecisions = rooms.map((room) => evaluateRoom(room, now, policy))
  const cleanupQueue = roomDecisions.flatMap((room) => room.cleanupQueue)
  const recoveryQueue = roomDecisions.flatMap((room) => room.recoveryQueue)
  const fanoutQueue = roomDecisions.flatMap((room) => room.fanoutQueue)
  const summary = summarize(roomDecisions, cleanupQueue, recoveryQueue, fanoutQueue)
  const auditPayload = {
    asOf,
    policy,
    summary,
    rooms: roomDecisions.map((room) => ({
      roomId: room.roomId,
      status: room.status,
      publishedSessions: room.sanitizedPresence.sessions.map((session) => session.sessionId),
      cleanupCodes: room.cleanupQueue.map((item) => item.code),
      recoveryCodes: room.recoveryQueue.map((item) => item.code),
    })),
  }

  return {
    asOf,
    summary,
    rooms: roomDecisions,
    cleanupQueue,
    recoveryQueue,
    fanoutQueue,
    audit: {
      algorithm: "sha256",
      digest: digest(auditPayload),
      policyVersion: policy.version || "presence-heartbeat-liveness-v1",
    },
  }
}

function evaluateRoom(room, now, policy) {
  const sessions = Array.isArray(room.sessions) ? room.sessions : []
  const cursors = new Map((room.cursors || []).map((cursor) => [cursor.sessionId, cursor]))
  const leases = new Map((room.presenceLeases || []).map((lease) => [lease.sessionId, lease]))
  const duplicateWinners = selectDuplicateWinners(sessions, now)
  const sessionDecisions = sessions.map((session) => {
    return evaluateSession({
      room,
      session,
      cursor: cursors.get(session.sessionId),
      lease: leases.get(session.sessionId),
      isDuplicateLoser: duplicateWinners.get(session.collaboratorId) !== session.sessionId,
      now,
      policy,
    })
  })

  const knownSessionIds = new Set(sessions.map((session) => session.sessionId))
  const orphanCursorActions = (room.cursors || [])
    .filter((cursor) => !knownSessionIds.has(cursor.sessionId))
    .map((cursor) => cleanupAction({
      roomId: room.roomId,
      sessionId: cursor.sessionId,
      collaboratorId: "unknown",
      code: "orphan_cursor",
      severity: "warning",
      message: "Cursor has no matching live session record.",
      remediation: "Drop cursor from the next presence snapshot.",
    }))

  const cleanupQueue = [
    ...sessionDecisions.flatMap((decision) => decision.cleanupActions),
    ...orphanCursorActions,
  ]
  const recoveryQueue = sessionDecisions.flatMap((decision) => decision.recoveryActions)
  const fanoutQueue = sessionDecisions
    .filter((decision) => decision.broadcast)
    .map((decision) => ({
      roomId: room.roomId,
      sessionId: decision.sessionId,
      collaboratorId: decision.collaboratorId,
      channel: "presence_snapshot",
      cursor: decision.publicCursor,
      typing: decision.publicTyping,
    }))

  const sanitizedPresence = {
    roomId: room.roomId,
    documentId: room.documentId,
    sessions: sessionDecisions
      .filter((decision) => decision.broadcast)
      .map((decision) => ({
        sessionId: decision.sessionId,
        collaboratorId: decision.collaboratorId,
        displayName: decision.displayName,
        status: decision.publicStatus,
        cursor: decision.publicCursor,
        typing: decision.publicTyping,
      })),
  }

  const critical = cleanupQueue.some((item) => item.severity === "critical")
  const warning = cleanupQueue.length > 0 || recoveryQueue.length > 0
  const status = critical ? "hold_broadcast_cleanup" : warning ? "sanitized_ready" : "ready"

  return {
    roomId: room.roomId,
    documentId: room.documentId,
    title: room.title,
    status,
    reviewedSessions: sessions.length,
    publishedSessions: sanitizedPresence.sessions.length,
    suppressedSessions: sessionDecisions.filter((decision) => !decision.broadcast).length,
    sanitizedPresence,
    sessionDecisions,
    cleanupQueue,
    recoveryQueue,
    fanoutQueue,
  }
}

function evaluateSession({ room, session, cursor, lease, isDuplicateLoser, now, policy }) {
  const heartbeatAge = secondsBetween(now, session.lastHeartbeatAt)
  const disconnectedAge = session.disconnectedAt ? secondsBetween(now, session.disconnectedAt) : null
  const typingAge = session.typingSince ? secondsBetween(now, session.typingSince) : null
  const leaseAge = lease ? secondsBetween(now, lease.expiresAt) : null
  const cleanupActions = []
  const recoveryActions = []
  const futureHeartbeat = heartbeatAge < -policy.maxFutureClockSkewSeconds
  const staleHeartbeat = heartbeatAge > policy.heartbeatStaleSeconds
  const ghostSession = heartbeatAge > policy.ghostSessionSeconds && Boolean(cursor || session.status === "editing")
  const reconnecting = session.status === "disconnected" && disconnectedAge !== null && disconnectedAge <= policy.reconnectGraceSeconds
  const expiredTyping = typingAge !== null && typingAge > policy.typingIndicatorSeconds
  const expiredLease = lease && leaseAge > 0

  let broadcast = true
  let publicStatus = session.status || "active"
  let publicCursor = cursor ? sanitizeCursor(cursor) : null
  let publicTyping = Boolean(session.typingSince)

  if (futureHeartbeat) {
    cleanupActions.push(cleanupAction({
      roomId: room.roomId,
      sessionId: session.sessionId,
      collaboratorId: session.collaboratorId,
      code: "future_heartbeat_clock_skew",
      severity: "warning",
      message: "Heartbeat timestamp is ahead of the room clock.",
      remediation: "Hold the timestamp for clock-skew review before fanout.",
    }))
    publicStatus = "clock_skew_review"
    publicCursor = null
    publicTyping = false
    broadcast = false
  }

  if (isDuplicateLoser) {
    cleanupActions.push(cleanupAction({
      roomId: room.roomId,
      sessionId: session.sessionId,
      collaboratorId: session.collaboratorId,
      code: "duplicate_tab_shadowed",
      severity: "warning",
      message: "A newer tab for the same collaborator is active.",
      remediation: "Keep only the newest tab in the next presence fanout.",
    }))
    broadcast = false
  }

  if (ghostSession) {
    cleanupActions.push(cleanupAction({
      roomId: room.roomId,
      sessionId: session.sessionId,
      collaboratorId: session.collaboratorId,
      code: "ghost_session",
      severity: "critical",
      message: `Heartbeat is stale by ${heartbeatAge}s while cursor or editing state is still visible.`,
      remediation: "Suppress cursor and remove the session from live fanout until a fresh heartbeat arrives.",
    }))
    broadcast = false
  } else if (staleHeartbeat && !reconnecting) {
    cleanupActions.push(cleanupAction({
      roomId: room.roomId,
      sessionId: session.sessionId,
      collaboratorId: session.collaboratorId,
      code: "stale_heartbeat",
      severity: "warning",
      message: `Heartbeat age ${heartbeatAge}s exceeds the ${policy.heartbeatStaleSeconds}s policy.`,
      remediation: "Hide cursor and ask the client to refresh presence.",
    }))
    broadcast = false
  }

  if (reconnecting) {
    recoveryActions.push({
      roomId: room.roomId,
      sessionId: session.sessionId,
      collaboratorId: session.collaboratorId,
      code: "reconnect_grace",
      action: "hold_cursor_restore_marker",
      expiresInSeconds: Math.max(0, policy.reconnectGraceSeconds - disconnectedAge),
    })
    publicStatus = "reconnecting"
    publicCursor = null
    publicTyping = false
    broadcast = false
  }

  if (expiredTyping) {
    cleanupActions.push(cleanupAction({
      roomId: room.roomId,
      sessionId: session.sessionId,
      collaboratorId: session.collaboratorId,
      code: "expired_typing_indicator",
      severity: "warning",
      message: `Typing indicator age ${typingAge}s exceeds the ${policy.typingIndicatorSeconds}s policy.`,
      remediation: "Drop typing state while preserving the session if heartbeat is fresh.",
    }))
    publicTyping = false
  }

  if (expiredLease) {
    cleanupActions.push(cleanupAction({
      roomId: room.roomId,
      sessionId: session.sessionId,
      collaboratorId: session.collaboratorId,
      code: "expired_presence_fanout_lease",
      severity: "warning",
      message: "Presence fanout lease expired before the next broadcast window.",
      remediation: "Renew lease before including this session in a fanout batch.",
    }))
    broadcast = false
  }

  return {
    roomId: room.roomId,
    sessionId: session.sessionId,
    collaboratorId: session.collaboratorId,
    displayName: session.displayName,
    heartbeatAge,
    broadcast,
    publicStatus,
    publicCursor,
    publicTyping,
    cleanupActions,
    recoveryActions,
  }
}

function selectDuplicateWinners(sessions, now) {
  const byCollaborator = new Map()
  for (const session of sessions) {
    const previous = byCollaborator.get(session.collaboratorId)
    if (!previous || Date.parse(session.lastHeartbeatAt) > Date.parse(previous.lastHeartbeatAt)) {
      byCollaborator.set(session.collaboratorId, session)
    }
  }

  const winners = new Map()
  for (const [collaboratorId, session] of byCollaborator.entries()) {
    const sameCollaborator = sessions.filter((candidate) => candidate.collaboratorId === collaboratorId)
    if (sameCollaborator.length === 1) {
      winners.set(collaboratorId, session.sessionId)
      continue
    }

    const winnerAge = secondsBetween(now, session.lastHeartbeatAt)
    if (winnerAge <= DEFAULT_POLICY.duplicateTabWindowSeconds || session.status === "active") {
      winners.set(collaboratorId, session.sessionId)
    } else {
      winners.set(collaboratorId, session.sessionId)
    }
  }

  return winners
}

function sanitizeCursor(cursor) {
  return {
    sectionId: cursor.sectionId,
    blockId: cursor.blockId,
    offset: Number.isFinite(Number(cursor.offset)) ? Number(cursor.offset) : 0,
  }
}

function cleanupAction({ roomId, sessionId, collaboratorId, code, severity, message, remediation }) {
  return { roomId, sessionId, collaboratorId, code, severity, message, remediation }
}

function summarize(rooms, cleanupQueue, recoveryQueue, fanoutQueue) {
  return {
    totalRooms: rooms.length,
    totalSessions: rooms.reduce((sum, room) => sum + room.reviewedSessions, 0),
    publishedSessions: rooms.reduce((sum, room) => sum + room.publishedSessions, 0),
    suppressedSessions: rooms.reduce((sum, room) => sum + room.suppressedSessions, 0),
    cleanupActions: cleanupQueue.length,
    recoveryActions: recoveryQueue.length,
    fanoutEvents: fanoutQueue.length,
    holdRooms: rooms.filter((room) => room.status === "hold_broadcast_cleanup").length,
    sanitizedRooms: rooms.filter((room) => room.status === "sanitized_ready").length,
    readyRooms: rooms.filter((room) => room.status === "ready").length,
  }
}

function secondsBetween(nowMillis, timestamp) {
  const parsed = Date.parse(timestamp)
  if (!Number.isFinite(parsed)) {
    return Number.POSITIVE_INFINITY
  }

  return Math.round((nowMillis - parsed) / 1000)
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`
  }

  return JSON.stringify(value)
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex")
}

module.exports = {
  DEFAULT_POLICY,
  evaluatePresenceLiveness,
  stableStringify,
}
