export const institution = {
  id: "inst-northbridge",
  name: "Northbridge Institute",
  plan: "enterprise",
  seats: { purchased: 140, active: 118, suspended: 4 },
  projects: [
    { id: "p-oxide", title: "Oxide Neuromorphic Arrays", members: 24, repositories: 9, reviewsOpen: 6 },
    { id: "p-climate", title: "Urban Climate Twin", members: 38, repositories: 14, reviewsOpen: 11 },
    { id: "p-protein", title: "Open Protein Folding Benchmarks", members: 31, repositories: 7, reviewsOpen: 3 }
  ],
  usage: {
    storageGb: 842,
    computeCredits: 12840,
    apiCalls30d: 89240,
    activeUsers30d: 104,
    exports30d: 73
  },
  compliance: {
    dataResidency: "us-east",
    retentionDays: 2555,
    consentRecords: 132,
    overdueAccessReviews: 2,
    auditEvents30d: 1872
  }
};

export const apiSurface = [
  { path: "/v1/projects", owner: "platform", scopes: ["projects:read", "projects:write"], rateLimit: 1200 },
  { path: "/v1/repositories", owner: "repository", scopes: ["repositories:read", "repositories:write"], rateLimit: 900 },
  { path: "/v1/compliance/exports", owner: "governance", scopes: ["compliance:export"], rateLimit: 60 },
  { path: "/v1/webhooks", owner: "integrations", scopes: ["webhooks:manage"], rateLimit: 300 }
];

export const subscribers = [
  { id: "sub-slack", target: "Slack research ops", events: ["review.opened", "export.completed"], healthy: true },
  { id: "sub-siem", target: "Institution SIEM", events: ["access.changed", "api.key.rotated"], healthy: true },
  { id: "sub-lims", target: "Lab inventory system", events: ["artifact.published"], healthy: false }
];
