const deprovisioningPolicy = {
  maxTokenAgeAfterTerminationHours: 2,
  maxSeatGraceHours: 24,
  protectedRoles: ["org-admin", "billing-admin", "export-admin", "publication-owner"],
  exportSystems: ["DSpace", "Invenio", "Zenodo", "PubMed Central"],
}

const identities = [
  {
    id: "USR-OK-001",
    email: "active.researcher@example.edu",
    hrisStatus: "active",
    scimActive: true,
    department: "Bioinformatics",
    roles: ["researcher"],
    apiTokens: [
      { id: "tok-active-1", active: true, lastRotatedAt: "2026-05-01T12:00:00Z" },
    ],
    exportConnectors: [],
    seatLicense: { plan: "enterprise-researcher", active: true, lastChangedAt: "2026-05-01T12:00:00Z" },
    computeQuota: { active: true, remainingHours: 20 },
    pendingPublications: [],
  },
  {
    id: "USR-REVOKE-002",
    email: "departed.admin@example.edu",
    hrisStatus: "terminated",
    terminationAt: "2026-05-21T06:00:00Z",
    scimActive: false,
    department: "Chemistry",
    roles: ["org-admin", "export-admin"],
    apiTokens: [
      { id: "tok-admin-9", active: true, lastRotatedAt: "2026-04-10T08:00:00Z" },
    ],
    exportConnectors: [
      { id: "exp-zenodo-4", system: "Zenodo", ownerEmail: "departed.admin@example.edu", active: true },
    ],
    seatLicense: { plan: "enterprise-admin", active: true, lastChangedAt: "2026-01-01T00:00:00Z" },
    computeQuota: { active: true, remainingHours: 180 },
    pendingPublications: [
      { id: "PUB-77", stage: "journal-export", needsOwnerTransfer: true },
    ],
  },
  {
    id: "USR-REVIEW-003",
    email: "visiting.scholar@example.edu",
    hrisStatus: "contract-ended",
    terminationAt: "2026-05-20T18:00:00Z",
    scimActive: true,
    department: "Materials",
    roles: ["researcher", "publication-owner"],
    apiTokens: [
      { id: "tok-visitor-2", active: false, lastRotatedAt: "2026-05-19T08:00:00Z" },
    ],
    exportConnectors: [],
    seatLicense: { plan: "enterprise-researcher", active: true, lastChangedAt: "2026-05-01T00:00:00Z" },
    computeQuota: { active: false, remainingHours: 0 },
    pendingPublications: [
      { id: "PUB-91", stage: "preprint-deposit", needsOwnerTransfer: true },
    ],
  },
  {
    id: "USR-RECLAIM-004",
    email: "transferred.pi@example.edu",
    hrisStatus: "department-transfer",
    transferAt: "2026-05-21T07:30:00Z",
    scimActive: true,
    department: "Physics",
    roles: ["billing-admin", "researcher"],
    apiTokens: [
      { id: "tok-pi-3", active: true, lastRotatedAt: "2026-05-19T06:00:00Z" },
    ],
    exportConnectors: [
      { id: "exp-dspace-2", system: "DSpace", ownerEmail: "transferred.pi@example.edu", active: true },
    ],
    seatLicense: { plan: "enterprise-admin", active: true, lastChangedAt: "2026-02-01T00:00:00Z" },
    computeQuota: { active: true, remainingHours: 75 },
    pendingPublications: [],
  },
]

module.exports = {
  deprovisioningPolicy,
  identities,
}
