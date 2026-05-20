const { buildIncidentDashboard } = require("./index")

const incidents = [
  {
    id: "inc-privacy-001",
    category: "privacy",
    status: "open",
    projectId: "project-genomics",
    department: "Precision Medicine",
    integration: "institutional-repository",
    dataClass: "regulated",
    affectedRecords: 3200,
    detectedAt: "2026-05-19T01:00:00.000Z",
    evidence: {
      owner: "privacy-office",
      affectedRecords: true,
      timeline: true,
    },
  },
  {
    id: "inc-export-014",
    category: "export",
    status: "investigating",
    projectId: "project-climate",
    department: "Earth Systems",
    integration: "journal-export",
    dataClass: "internal",
    affectedRecords: 85,
    detectedAt: "2026-05-19T18:00:00.000Z",
    evidence: {
      owner: "research-office",
      affectedRecords: true,
      timeline: true,
      mitigation: true,
    },
  },
  {
    id: "inc-integration-022",
    category: "integration",
    status: "mitigated",
    projectId: "project-materials",
    department: "Materials Lab",
    integration: "eln-webhook",
    dataClass: "restricted",
    affectedRecords: 140,
    detectedAt: "2026-05-18T16:30:00.000Z",
    evidence: {
      owner: "integration-team",
      affectedRecords: true,
      timeline: true,
      mitigation: true,
      rootCause: true,
    },
  },
]

const dashboard = buildIncidentDashboard(incidents, {
  nowIso: "2026-05-20T01:30:00.000Z",
  generatedFor: "institution_admin_console",
})

console.log("Enterprise incident response governance")
console.log(JSON.stringify(dashboard, null, 2))
