const crypto = require("node:crypto")

const SEVERITY_WEIGHTS = {
  privacy: 0.35,
  access: 0.28,
  export: 0.22,
  integration: 0.18,
  compliance: 0.24,
}

const DATA_CLASS_WEIGHTS = {
  public: 0,
  internal: 0.18,
  restricted: 0.45,
  personal: 0.65,
  regulated: 0.8,
}

const STATUS_WEIGHTS = {
  open: 0.25,
  investigating: 0.18,
  mitigated: 0.08,
  closed: 0,
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

function digest(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex")
}

function signPacket(packet, signingKey = "synthetic-enterprise-incident-demo-key") {
  return crypto.createHmac("sha256", signingKey).update(stableJson(packet)).digest("hex")
}

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max)
}

function hoursBetween(startIso, endIso) {
  return Math.max((Date.parse(endIso) - Date.parse(startIso)) / 36e5, 0)
}

function addHours(startIso, hours) {
  return new Date(Date.parse(startIso) + hours * 36e5).toISOString()
}

function notificationWindowHours(incident) {
  if (incident.dataClass === "regulated") return 24
  if (incident.dataClass === "personal") return 72
  if (incident.dataClass === "restricted") return 96
  return null
}

function evidenceCompleteness(incident) {
  const required = [
    "owner",
    "affectedRecords",
    "timeline",
    "mitigation",
    "rootCause",
  ]
  const present = required.filter((field) => Boolean(incident.evidence?.[field]))
  return Number((present.length / required.length).toFixed(4))
}

function scoreIncident(incident, nowIso = new Date().toISOString()) {
  const categoryScore = SEVERITY_WEIGHTS[incident.category] || 0.15
  const dataClassScore = DATA_CLASS_WEIGHTS[incident.dataClass] || 0.1
  const statusScore = STATUS_WEIGHTS[incident.status] ?? 0.2
  const affectedRecordScore = clamp((incident.affectedRecords || 0) / 5000)
  const evidenceGapScore = 1 - evidenceCompleteness(incident)
  const clockHours = notificationWindowHours(incident)
  const clockScore =
    clockHours == null
      ? 0
      : clamp(hoursBetween(incident.detectedAt, nowIso) / clockHours)

  return Number(
    clamp(
      categoryScore +
        dataClassScore * 0.28 +
        statusScore +
        affectedRecordScore * 0.18 +
        evidenceGapScore * 0.16 +
        clockScore * 0.13,
    ).toFixed(4),
  )
}

function severityTier(score) {
  if (score >= 0.85) return "critical"
  if (score >= 0.65) return "high"
  if (score >= 0.4) return "medium"
  return "low"
}

function notificationClock(incident, nowIso) {
  const windowHours = notificationWindowHours(incident)
  if (windowHours == null) {
    return {
      required: false,
      dueAt: null,
      hoursRemaining: null,
      overdue: false,
    }
  }
  const dueAt = addHours(incident.detectedAt, windowHours)
  const hoursRemaining = Number(((Date.parse(dueAt) - Date.parse(nowIso)) / 36e5).toFixed(2))
  return {
    required: true,
    dueAt,
    hoursRemaining,
    overdue: hoursRemaining < 0,
  }
}

function requiredOwnerQueues(incident, score) {
  const owners = new Set()
  if (incident.category === "privacy" || incident.dataClass === "regulated" || incident.dataClass === "personal") {
    owners.add("privacy_officer")
  }
  if (incident.category === "access") owners.add("security_admin")
  if (incident.category === "integration") owners.add("integration_owner")
  if (incident.category === "export") owners.add("research_office")
  if (score >= 0.65) owners.add("institution_admin")
  if (score >= 0.85) owners.add("executive_sponsor")
  return [...owners]
}

function incidentActions(incident, score, clock) {
  const actions = []
  if (clock.required && clock.overdue) actions.push("Escalate overdue breach-notification clock.")
  if (clock.required && !clock.overdue) actions.push("Prepare notification decision before deadline.")
  if (evidenceCompleteness(incident) < 1) actions.push("Complete incident evidence packet.")
  if (incident.category === "export") actions.push("Hold affected export pipeline until review closes.")
  if (incident.category === "access") actions.push("Run access review for affected project and actor.")
  if (incident.category === "integration") actions.push("Rotate or verify connector credentials before replay.")
  if (score >= 0.85) actions.push("Open executive incident bridge.")
  return actions
}

function exportHoldDecision(incident, score) {
  if (incident.category === "export" && score >= 0.4) return "hold_export"
  if ((incident.dataClass === "regulated" || incident.dataClass === "personal") && score >= 0.65) return "hold_sensitive_exports"
  return "allow_exports"
}

function buildIncidentPacket(incident, options = {}) {
  const nowIso = options.nowIso || new Date().toISOString()
  const score = scoreIncident(incident, nowIso)
  const clock = notificationClock(incident, nowIso)
  const packet = {
    incidentId: incident.id,
    category: incident.category,
    status: incident.status,
    severityScore: score,
    severityTier: severityTier(score),
    projectId: incident.projectId,
    department: incident.department,
    integration: incident.integration,
    dataClass: incident.dataClass,
    affectedRecords: incident.affectedRecords || 0,
    detectedAt: incident.detectedAt,
    notificationClock: clock,
    evidenceCompleteness: evidenceCompleteness(incident),
    ownerQueues: requiredOwnerQueues(incident, score),
    actions: incidentActions(incident, score, clock),
    exportDecision: exportHoldDecision(incident, score),
  }
  const auditDigest = digest(packet)
  const webhookEvent = {
    type: "enterprise.incident.governance",
    incidentId: packet.incidentId,
    severityTier: packet.severityTier,
    exportDecision: packet.exportDecision,
    auditDigest,
  }

  return {
    ...packet,
    auditDigest,
    webhookEvent: {
      ...webhookEvent,
      signature: signPacket(webhookEvent, options.signingKey),
    },
  }
}

function buildIncidentDashboard(incidents, options = {}) {
  const packets = incidents
    .map((incident) => buildIncidentPacket(incident, options))
    .sort((a, b) => b.severityScore - a.severityScore)
  const teamQueues = {}
  for (const packet of packets) {
    for (const queue of packet.ownerQueues) {
      teamQueues[queue] = (teamQueues[queue] || 0) + 1
    }
  }

  const dashboard = {
    generatedFor: options.generatedFor || "enterprise_admin_dashboard",
    incidentCount: packets.length,
    openIncidents: packets.filter((packet) => packet.status !== "closed").length,
    criticalIncidents: packets.filter((packet) => packet.severityTier === "critical").map((packet) => packet.incidentId),
    overdueNotifications: packets.filter((packet) => packet.notificationClock.overdue).map((packet) => packet.incidentId),
    heldExports: packets.filter((packet) => packet.exportDecision !== "allow_exports").map((packet) => packet.incidentId),
    teamQueues,
    packets,
  }

  return {
    ...dashboard,
    auditDigest: digest(packets.map((packet) => packet.auditDigest)),
  }
}

module.exports = {
  buildIncidentDashboard,
  buildIncidentPacket,
  digest,
  evidenceCompleteness,
  scoreIncident,
  signPacket,
  stableJson,
}
