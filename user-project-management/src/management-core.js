export const demoWorkspace = {
  users: [
    {
      id: "user-alice",
      name: "Alice Chen",
      email: "alice@scibase.example",
      institution: "SCIBASE Oncology Lab",
      field: "Cancer biology",
      orcid: "0000-0002-1825-0097",
      oauth: ["ORCID", "Google", "GitHub"],
      mfaEnabled: true,
      profileMode: "public",
      keywords: ["organoids", "biomarkers", "reproducibility"],
      metrics: { downloads: 1240, forks: 18, endorsements: 42, reproducibilityScore: 94 },
      activity: ["Created organoid response atlas", "Reviewed validation cohort", "Published v1 DOI"]
    },
    {
      id: "user-mateo",
      name: "Mateo Rivera",
      email: "mateo@open-repro.example",
      institution: "Open Reproducibility Center",
      field: "Computational biology",
      orcid: "0000-0003-2201-4120",
      oauth: ["ORCID", "GitHub", "LinkedIn"],
      mfaEnabled: true,
      profileMode: "public",
      keywords: ["pipelines", "statistics", "notebooks"],
      metrics: { downloads: 840, forks: 11, endorsements: 35, reproducibilityScore: 91 },
      activity: ["Added reproducibility workflow", "Opened peer review thread"]
    }
  ],
  institutions: [
    { id: "inst-sci", name: "SCIBASE Oncology Lab", samlEntityId: "https://sso.scibase.example/saml", domains: ["scibase.example"] },
    { id: "inst-open", name: "Open Reproducibility Center", samlEntityId: "https://sso.open-repro.example/saml", domains: ["open-repro.example"] }
  ],
  projects: [
    {
      id: "project-organoid-response",
      title: "Organoid chemotherapy response atlas",
      visibility: "institutional-only",
      status: "active",
      ownerId: "user-alice",
      metadata: {
        funding: ["Open Science Accelerator"],
        citation: "Chen and Rivera, 2026",
        tags: ["oncology", "organoids"]
      },
      resources: {
        documents: ["manuscript/main.md", "protocols/organoid-culture.md"],
        code: ["code/run_analysis.py"],
        datasets: ["data/growth_curves.csv"],
        discussions: ["review-statistics", "data-access"],
        citations: ["10.5555/scibase.project-organoid-response.v1"]
      },
      collaborators: ["user-alice", "user-mateo"],
      accessRules: [
        { principalId: "user-alice", role: "Owner", scope: "project", expiresAt: null },
        { principalId: "user-mateo", role: "Contributor", scope: "code", expiresAt: null },
        { principalId: "external-reviewer-1", role: "Reviewer", scope: "documents", expiresAt: "2026-06-01T00:00:00.000Z" }
      ],
      auditLog: [
        { actorId: "user-alice", action: "project.created", target: "project-organoid-response", createdAt: "2026-05-01T10:00:00.000Z" },
        { actorId: "user-alice", action: "access.invited", target: "external-reviewer-1", createdAt: "2026-05-04T13:00:00.000Z" },
        { actorId: "user-mateo", action: "code.updated", target: "code/run_analysis.py", createdAt: "2026-05-05T15:30:00.000Z" }
      ]
    }
  ]
};

export const rolePermissions = {
  Owner: ["manage_project", "manage_access", "edit_documents", "edit_code", "download_data", "review", "archive"],
  Admin: ["manage_access", "edit_documents", "edit_code", "download_data", "review"],
  Contributor: ["edit_documents", "edit_code", "review"],
  Reviewer: ["read_documents", "review"],
  Viewer: ["read_documents"]
};

export function authenticateIdentity({ provider, identifier, mfaCode }, workspace = demoWorkspace) {
  const user = workspace.users.find((item) => item.email === identifier || item.orcid === identifier);
  if (!user) return { authenticated: false, reason: "unknown_identity" };
  const providerAllowed = provider === "email" || user.oauth.includes(provider) || provider === "SAML";
  const mfaSatisfied = !user.mfaEnabled || /^\d{6}$/.test(mfaCode || "");
  return {
    authenticated: providerAllowed && mfaSatisfied,
    userId: user.id,
    provider,
    identityLinks: [...user.oauth, "email", "SAML"],
    reason: providerAllowed ? (mfaSatisfied ? "ok" : "mfa_required") : "provider_not_linked"
  };
}

export function syncOrcidProfile(userId, workspace = demoWorkspace) {
  const user = getUser(userId, workspace);
  return {
    userId,
    orcid: user.orcid,
    importedPublications: [
      `${user.name}. Reproducible organoid assays. 2026.`,
      `${user.name}. Scientific workflow governance. 2025.`
    ],
    affiliations: [user.institution],
    keywords: user.keywords
  };
}

export function computeReputation(userId, workspace = demoWorkspace) {
  const user = getUser(userId, workspace);
  const score = Math.round(
    Math.log1p(user.metrics.downloads) * 5 +
      user.metrics.forks * 1.5 +
      user.metrics.endorsements * 2 +
      user.metrics.reproducibilityScore * 0.9
  );
  return {
    userId,
    score,
    breakdown: [
      { label: "downloads", value: user.metrics.downloads },
      { label: "forks", value: user.metrics.forks },
      { label: "endorsements", value: user.metrics.endorsements },
      { label: "reproducibility", value: user.metrics.reproducibilityScore }
    ]
  };
}

export function createProjectSpace({ title, ownerId, visibility = "private", tags = [] }, workspace = demoWorkspace) {
  getUser(ownerId, workspace);
  const id = `project-${slug(title)}`;
  const project = {
    id,
    title,
    visibility,
    status: "active",
    ownerId,
    metadata: { funding: [], citation: "", tags },
    resources: { documents: [], code: [], datasets: [], discussions: [], citations: [] },
    collaborators: [ownerId],
    accessRules: [{ principalId: ownerId, role: "Owner", scope: "project", expiresAt: null }],
    auditLog: [{ actorId: ownerId, action: "project.created", target: id, createdAt: "2026-05-09T00:00:00.000Z" }]
  };
  return { workspace: { ...workspace, projects: [...workspace.projects, project] }, project };
}

export function evaluateAccess({ userId, projectId, action, objectType = "project" }, workspace = demoWorkspace) {
  const project = getProject(projectId, workspace);
  const rules = project.accessRules.filter((rule) => rule.principalId === userId && !isExpired(rule.expiresAt));
  const allowedRules = rules.filter((rule) => rule.scope === "project" || rule.scope === objectType);
  const granted = allowedRules.some((rule) => (rolePermissions[rule.role] || []).includes(action));
  return {
    granted,
    userId,
    projectId,
    action,
    objectType,
    matchedRoles: allowedRules.map((rule) => rule.role)
  };
}

export function inviteCollaborator({ actorId, projectId, principalId, role, scope = "project", expiresAt = null }, workspace = demoWorkspace) {
  const access = evaluateAccess({ userId: actorId, projectId, action: "manage_access" }, workspace);
  if (!access.granted) throw new Error("Actor cannot manage project access");
  const project = getProject(projectId, workspace);
  const updatedProject = {
    ...project,
    collaborators: [...new Set([...project.collaborators, principalId])],
    accessRules: [...project.accessRules, { principalId, role, scope, expiresAt }],
    auditLog: [
      ...project.auditLog,
      { actorId, action: "access.invited", target: principalId, createdAt: "2026-05-09T00:00:00.000Z" }
    ]
  };
  return replaceProject(workspace, updatedProject);
}

export function buildProjectDashboard(workspace = demoWorkspace) {
  const project = workspace.projects[0];
  return {
    auth: authenticateIdentity({ provider: "ORCID", identifier: workspace.users[0].orcid, mfaCode: "123456" }, workspace),
    profiles: workspace.users.map((user) => ({
      ...user,
      orcidSync: syncOrcidProfile(user.id, workspace),
      reputation: computeReputation(user.id, workspace)
    })),
    project,
    accessMatrix: project.accessRules.map((rule) => ({
      ...rule,
      permissions: rolePermissions[rule.role] || []
    })),
    policyChecks: [
      evaluateAccess({ userId: "user-alice", projectId: project.id, action: "manage_access" }, workspace),
      evaluateAccess({ userId: "user-mateo", projectId: project.id, action: "download_data", objectType: "datasets" }, workspace),
      evaluateAccess({ userId: "external-reviewer-1", projectId: project.id, action: "review", objectType: "documents" }, workspace)
    ]
  };
}

function getUser(userId, workspace) {
  const user = workspace.users.find((item) => item.id === userId);
  if (!user) throw new Error(`Unknown user: ${userId}`);
  return user;
}

function getProject(projectId, workspace) {
  const project = workspace.projects.find((item) => item.id === projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  return project;
}

function replaceProject(workspace, project) {
  return { ...workspace, projects: workspace.projects.map((item) => (item.id === project.id ? project : item)) };
}

function isExpired(expiresAt) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < new Date("2026-05-09T00:00:00.000Z").getTime());
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
