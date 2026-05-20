"use strict"

const fs = require("node:fs")
const path = require("node:path")
const { assessEnterpriseInitiativeTags } = require("./index")

const input = {
  now: "2026-05-20T00:00:00.000Z",
  organizationId: "research-office-demo",
  policies: [
    {
      id: "GRANT-TRACKED",
      label: "Grant tracked",
      allowedScopes: ["biology", "materials"],
      requiresOwnerApproval: true,
      requiresExpiry: true,
      maxDurationDays: 540,
      requiredEvidence: ["grant-award-letter"],
      publishToDashboard: true,
      funderId: "nih-r01-42",
      minimumReproducibilityScore: 80,
      openAccessRequired: true,
    },
    {
      id: "DOCTORAL-WORK",
      label: "Doctoral work",
      allowedScopes: ["biology", "physics"],
      requiresOwnerApproval: true,
      requiresExpiry: true,
      publishToDashboard: true,
    },
    {
      id: "PUBLIC-INITIATIVE",
      label: "Public initiative",
      allowedScopes: ["organization"],
      requiresOwnerApproval: true,
      requiresExpiry: true,
      publishToDashboard: true,
      restrictedDataAllowed: false,
    },
  ],
  evidence: [{ id: "grant-award-letter" }],
  projects: [
    {
      id: "project-atlas",
      title: "Single-cell atlas release",
      department: "biology",
      visibility: "public",
      dataClassification: "open",
      funderIds: ["nih-r01-42"],
      compliance: { openAccessStatus: "open", reproducibilityScore: 92 },
    },
    {
      id: "project-embargo",
      title: "Embargoed sponsor validation",
      department: "oncology",
      visibility: "private",
      dataClassification: "restricted",
      funderIds: ["sponsor-7"],
      compliance: { openAccessStatus: "embargoed", reproducibilityScore: 68 },
    },
  ],
  assignments: [
    {
      projectId: "project-atlas",
      tagId: "GRANT-TRACKED",
      scope: "biology",
      assignedAt: "2026-01-10T00:00:00.000Z",
      expiresAt: "2026-12-31T00:00:00.000Z",
      ownerApproval: true,
      evidenceIds: ["grant-award-letter"],
    },
    {
      projectId: "project-atlas",
      tagId: "DOCTORAL-WORK",
      scope: "biology",
      assignedAt: "2026-03-01T00:00:00.000Z",
      expiresAt: "2026-11-30T00:00:00.000Z",
      ownerApproval: true,
    },
    {
      projectId: "project-embargo",
      tagId: "PUBLIC-INITIATIVE",
      scope: "organization",
      assignedAt: "2025-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:00:00.000Z",
      ownerApproval: false,
    },
  ],
}

const result = assessEnterpriseInitiativeTags(input)
const outDir = path.join(__dirname, "reports")
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, "reviewer-packet.json"), `${JSON.stringify(result, null, 2)}\n`)

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="Enterprise initiative tag governance demo">
  <rect width="1280" height="720" fill="#111827"/>
  <rect x="56" y="56" width="1168" height="608" rx="28" fill="#f8fafc"/>
  <text x="104" y="130" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#111827">Enterprise Initiative Tag Governance</text>
  <text x="104" y="176" font-family="Arial, sans-serif" font-size="24" fill="#475569">Admin dashboard custom tags checked before analytics rollups and webhooks.</text>
  <rect x="104" y="230" width="312" height="150" rx="18" fill="#dcfce7"/>
  <text x="132" y="286" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#166534">${result.summary.approved}</text>
  <text x="132" y="330" font-family="Arial, sans-serif" font-size="24" fill="#166534">approved tags</text>
  <rect x="456" y="230" width="312" height="150" rx="18" fill="#fef9c3"/>
  <text x="484" y="286" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#854d0e">${result.summary.warningCount}</text>
  <text x="484" y="330" font-family="Arial, sans-serif" font-size="24" fill="#854d0e">warnings</text>
  <rect x="808" y="230" width="312" height="150" rx="18" fill="#fee2e2"/>
  <text x="836" y="286" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#991b1b">${result.summary.held}</text>
  <text x="836" y="330" font-family="Arial, sans-serif" font-size="24" fill="#991b1b">held tags</text>
  <text x="104" y="450" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#111827">Reviewer signal</text>
  <text x="104" y="494" font-family="Arial, sans-serif" font-size="22" fill="#334155">Status: ${result.status}</text>
  <text x="104" y="532" font-family="Arial, sans-serif" font-size="22" fill="#334155">Webhook events: ${result.webhookEvents.length}</text>
  <text x="104" y="570" font-family="Arial, sans-serif" font-size="22" fill="#334155">Audit digest: ${result.auditDigest.slice(0, 24)}...</text>
</svg>
`

fs.writeFileSync(path.join(__dirname, "demo.svg"), svg)
console.log(`status=${result.status}`)
console.log(`approved=${result.summary.approved} held=${result.summary.held} warnings=${result.summary.warningCount}`)
console.log(`auditDigest=${result.auditDigest}`)
console.log(`wrote ${path.relative(process.cwd(), path.join(outDir, "reviewer-packet.json"))}`)
console.log(`wrote ${path.relative(process.cwd(), path.join(__dirname, "demo.svg"))}`)
