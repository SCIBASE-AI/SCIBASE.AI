export const organization = {
  id: "org-university-research",
  name: "University Research Office",
  departments: ["Oncology", "Neuroscience", "Materials Science"],
  projects: [
    { id: "proj-organoid", title: "Organoid response atlas", department: "Oncology", visibility: "public", storageGb: 42, computeHours: 18, submissions: 3, aiReviews: 7, peerReviews: 5, reproducibilityScore: 94, openAccess: true, funderMandate: "NIH", tags: ["GRANT-TRACKED"] },
    { id: "proj-neuro", title: "CRISPR neural clustering", department: "Neuroscience", visibility: "private", storageGb: 28, computeHours: 31, submissions: 1, aiReviews: 4, peerReviews: 2, reproducibilityScore: 87, openAccess: false, funderMandate: "Horizon EU", tags: ["DOCTORAL WORK"] },
    { id: "proj-materials", title: "Polymer catalyst screening", department: "Materials Science", visibility: "institutional", storageGb: 64, computeHours: 44, submissions: 2, aiReviews: 6, peerReviews: 4, reproducibilityScore: 91, openAccess: true, funderMandate: "UKRI", tags: ["INDUSTRY"] }
  ],
  contributors: [
    { id: "user-alice", name: "Alice Chen", lab: "Oncology", logins: 42, commits: 18, collaborations: ["Neuroscience"], orcid: "0000-0002-1825-0097" },
    { id: "user-mateo", name: "Mateo Rivera", lab: "Open Reproducibility", logins: 33, commits: 21, collaborations: ["Oncology", "Materials Science"], orcid: "0000-0003-2201-4120" },
    { id: "user-sam", name: "Sam Okafor", lab: "Materials Science", logins: 24, commits: 11, collaborations: ["Oncology"], orcid: "0000-0001-9911-4412" }
  ],
  integrations: [
    { id: "dspace", name: "DSpace", type: "institutional-repository", endpoint: "https://repo.example/api", enabled: true },
    { id: "canvas", name: "Canvas", type: "lms", endpoint: "https://canvas.example/api", enabled: true },
    { id: "benchling", name: "Benchling", type: "eln", endpoint: "https://benchling.example/api", enabled: false },
    { id: "orcid", name: "ORCID Sync", type: "personnel", endpoint: "https://orcid.org/api", enabled: true }
  ]
};

export function buildAdminDashboard(org = organization) {
  const totals = org.projects.reduce(
    (acc, project) => {
      acc.projects += 1;
      acc.storageGb += project.storageGb;
      acc.computeHours += project.computeHours;
      acc.submissions += project.submissions;
      acc.aiReviews += project.aiReviews;
      acc.peerReviews += project.peerReviews;
      acc.publicProjects += project.visibility === "public" ? 1 : 0;
      acc.openAccess += project.openAccess ? 1 : 0;
      acc.reproducibility += project.reproducibilityScore;
      return acc;
    },
    { projects: 0, storageGb: 0, computeHours: 0, submissions: 0, aiReviews: 0, peerReviews: 0, publicProjects: 0, openAccess: 0, reproducibility: 0 }
  );
  return {
    organization: org.name,
    overview: { ...totals, averageReproducibility: Math.round(totals.reproducibility / totals.projects) },
    departmentMetrics: org.departments.map((department) => summarizeDepartment(org, department)),
    contributorAnalytics: org.contributors.map((contributor) => ({
      ...contributor,
      productivityScore: contributor.commits * 2 + contributor.logins + contributor.collaborations.length * 8
    })),
    compliance: org.projects.map((project) => ({
      projectId: project.id,
      mandate: project.funderMandate,
      openAccess: project.openAccess,
      reproducibilityScore: project.reproducibilityScore,
      status: project.openAccess && project.reproducibilityScore >= 90 ? "compliant" : "attention"
    })),
    tags: [...new Set(org.projects.flatMap((project) => project.tags))]
  };
}

export function buildRestApiCatalog(org = organization) {
  return {
    auth: "Bearer token scoped to institution",
    routes: [
      "GET /api/enterprise/projects",
      "GET /api/enterprise/contributors",
      "GET /api/enterprise/compliance",
      "POST /api/enterprise/webhooks",
      "POST /api/enterprise/exports"
    ],
    integrations: org.integrations,
    scopes: ["read:projects", "read:analytics", "write:webhooks", "write:exports"]
  };
}

export function createWebhookEvent(type, projectId, org = organization) {
  const project = org.projects.find((item) => item.id === projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  return {
    id: `evt-${type}-${projectId}`,
    type,
    createdAt: "2026-05-09T00:00:00.000Z",
    deliveryTargets: org.integrations.filter((integration) => integration.enabled).map((integration) => integration.endpoint),
    payload: {
      projectId,
      title: project.title,
      department: project.department,
      visibility: project.visibility,
      reproducibilityScore: project.reproducibilityScore,
      tags: project.tags
    }
  };
}

export function buildExportPipeline({ projectId, target = "Zenodo", format = "JATS" }, org = organization) {
  const project = org.projects.find((item) => item.id === projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  const plugins = {
    arXiv: ["LaTeX", "BibTeX", "PDF"],
    bioRxiv: ["Docx", "JATS", "Figures"],
    PubMed: ["JATS", "NIH metadata", "ORCID"],
    Zenodo: ["DataCite DOI", "metadata.json", "version history"],
    "NIH RePORTER": ["grant metadata", "public access compliance"]
  };
  return {
    projectId,
    target,
    format,
    steps: [
      "validate project metadata",
      `render manuscript as ${format}`,
      "attach DOI, ORCID, citations, and version history",
      `package repository for ${target}`,
      "emit export.completed webhook"
    ],
    preservedMetadata: ["DOI", "ORCID", "citations", "version history", "funder mandate"],
    plugins: plugins[target] || ["Docx", "metadata"],
    complianceStatus: project.openAccess ? "ready" : "requires open-access review"
  };
}

export function buildEnterprisePayload() {
  return {
    dashboard: buildAdminDashboard(),
    api: buildRestApiCatalog(),
    webhook: createWebhookEvent("project.published", "proj-organoid"),
    exportPipeline: buildExportPipeline({ projectId: "proj-organoid", target: "Zenodo", format: "JATS" })
  };
}

function summarizeDepartment(org, department) {
  const projects = org.projects.filter((project) => project.department === department);
  return {
    department,
    projectCount: projects.length,
    computeHours: projects.reduce((sum, project) => sum + project.computeHours, 0),
    storageGb: projects.reduce((sum, project) => sum + project.storageGb, 0),
    aiReviews: projects.reduce((sum, project) => sum + project.aiReviews, 0),
    peerReviews: projects.reduce((sum, project) => sum + project.peerReviews, 0)
  };
}
