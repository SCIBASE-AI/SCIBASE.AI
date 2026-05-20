const assert = require("node:assert/strict")
const {
  buildIncidentDashboard,
  buildIncidentPacket,
  digest,
  evidenceCompleteness,
  scoreIncident,
  signPacket,
} = require("./index")

const NOW = "2026-05-20T01:30:00.000Z"

function privacyIncident() {
  return {
    id: "privacy-1",
    category: "privacy",
    status: "open",
    projectId: "project-a",
    department: "Biology",
    integration: "dspace",
    dataClass: "regulated",
    affectedRecords: 5000,
    detectedAt: "2026-05-18T00:00:00.000Z",
    evidence: {
      owner: "privacy",
      affectedRecords: true,
      timeline: true,
    },
  }
}

function exportIncident() {
  return {
    id: "export-1",
    category: "export",
    status: "investigating",
    projectId: "project-b",
    department: "Physics",
    integration: "journal-export",
    dataClass: "internal",
    affectedRecords: 100,
    detectedAt: "2026-05-19T18:00:00.000Z",
    evidence: {
      owner: "research-office",
      affectedRecords: true,
      timeline: true,
      mitigation: true,
    },
  }
}

function testPrivacyIncidentEscalatesOverdueClock() {
  const packet = buildIncidentPacket(privacyIncident(), { nowIso: NOW })

  assert.equal(packet.severityTier, "critical")
  assert.equal(packet.notificationClock.required, true)
  assert.equal(packet.notificationClock.overdue, true)
  assert.ok(packet.ownerQueues.includes("privacy_officer"))
  assert.ok(packet.ownerQueues.includes("executive_sponsor"))
  assert.ok(packet.actions.some((action) => action.includes("overdue")))
}

function testExportIncidentHoldsPipeline() {
  const packet = buildIncidentPacket(exportIncident(), { nowIso: NOW })

  assert.equal(packet.exportDecision, "hold_export")
  assert.ok(packet.ownerQueues.includes("research_office"))
  assert.ok(packet.actions.some((action) => action.includes("export pipeline")))
}

function testCompleteEvidenceLowersScore() {
  const incomplete = scoreIncident(exportIncident(), NOW)
  const completeIncident = {
    ...exportIncident(),
    evidence: {
      owner: "research-office",
      affectedRecords: true,
      timeline: true,
      mitigation: true,
      rootCause: true,
    },
  }
  const complete = scoreIncident(completeIncident, NOW)

  assert.equal(evidenceCompleteness(completeIncident), 1)
  assert.ok(complete < incomplete)
}

function testDashboardAggregatesQueuesAndHolds() {
  const dashboard = buildIncidentDashboard([privacyIncident(), exportIncident()], { nowIso: NOW })

  assert.equal(dashboard.incidentCount, 2)
  assert.deepEqual(dashboard.criticalIncidents, ["privacy-1"])
  assert.ok(dashboard.heldExports.includes("privacy-1"))
  assert.ok(dashboard.heldExports.includes("export-1"))
  assert.equal(dashboard.teamQueues.privacy_officer, 1)
}

function testWebhookSignatureIsDeterministic() {
  const packet = buildIncidentPacket(exportIncident(), { nowIso: NOW, signingKey: "demo-key" })
  const event = {
    type: packet.webhookEvent.type,
    incidentId: packet.webhookEvent.incidentId,
    severityTier: packet.webhookEvent.severityTier,
    exportDecision: packet.webhookEvent.exportDecision,
    auditDigest: packet.webhookEvent.auditDigest,
  }

  assert.equal(packet.webhookEvent.signature, signPacket(event, "demo-key"))
}

function testStableDigestIgnoresObjectKeyOrder() {
  assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }))
}

const tests = [
  testPrivacyIncidentEscalatesOverdueClock,
  testExportIncidentHoldsPipeline,
  testCompleteEvidenceLowersScore,
  testDashboardAggregatesQueuesAndHolds,
  testWebhookSignatureIsDeterministic,
  testStableDigestIgnoresObjectKeyOrder,
]

for (const test of tests) {
  test()
  console.log(`ok - ${test.name}`)
}

console.log(`${tests.length} tests passed`)
