const ROLE_ORDER = Object.freeze(["viewer", "reviewer", "contributor", "admin", "owner"]);

function hasRoleAtLeast(actual, required) {
  return ROLE_ORDER.indexOf(actual) >= ROLE_ORDER.indexOf(required);
}

export function buildResearcherProfile(user) {
  return {
    id: user.id,
    displayName: user.displayName,
    institution: user.institution,
    fields: user.fields,
    linkedIdentities: user.linkedIdentities.map((identity) => ({
      provider: identity.provider,
      verified: identity.verified,
      externalId: identity.externalId
    })),
    mfaEnabled: user.authFactors.some((factor) => factor.type === "totp" && factor.active),
    publicProfile: user.profileVisibility === "public",
    reputation: calculateReputation(user)
  };
}

export function calculateReputation(user) {
  const downloads = user.metrics.downloads * 0.05;
  const reviews = user.metrics.peerReviews * 8;
  const reproducibility = user.metrics.reproducibilityScore * 0.7;
  const endorsements = user.metrics.endorsements * 5;
  return {
    score: Math.round(downloads + reviews + reproducibility + endorsements),
    downloads: user.metrics.downloads,
    peerReviews: user.metrics.peerReviews,
    reproducibilityScore: user.metrics.reproducibilityScore,
    endorsements: user.metrics.endorsements
  };
}

export function buildProjectSpace(project) {
  return {
    id: project.id,
    title: project.title,
    visibility: project.visibility,
    metadata: project.metadata,
    documents: project.resources.filter((resource) => resource.kind === "document").length,
    datasets: project.resources.filter((resource) => resource.kind === "dataset").length,
    codeAssets: project.resources.filter((resource) => resource.kind === "code").length,
    discussionThreads: project.discussions.length,
    collaborators: project.memberships.map((membership) => ({
      userId: membership.userId,
      role: membership.role
    }))
  };
}

export function evaluateAccess(project, userId, action, resourceId = null) {
  const membership = project.memberships.find((candidate) => candidate.userId === userId);
  const role = membership?.role ?? (project.visibility === "public" ? "viewer" : null);
  const resource = resourceId ? project.resources.find((candidate) => candidate.id === resourceId) : null;
  const requiredRole = actionToRole(action);
  const objectRule = resource?.permissions?.[action];
  const allowedByObjectRule = objectRule ? objectRule.includes(userId) : true;
  return {
    userId,
    action,
    resourceId,
    role,
    allowed: Boolean(role && hasRoleAtLeast(role, requiredRole) && allowedByObjectRule),
    reason: role ? `requires_${requiredRole}` : "no_membership"
  };
}

function actionToRole(action) {
  switch (action) {
    case "view":
      return "viewer";
    case "review":
      return "reviewer";
    case "edit":
      return "contributor";
    case "invite":
      return "admin";
    case "archive":
      return "owner";
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export function createInvitation(project, { email, role, invitedBy, expiresAt }) {
  if (!hasRoleAtLeast(role, "viewer")) throw new Error(`Unknown invitation role: ${role}`);
  return {
    id: `invite:${project.id}:${email.toLowerCase()}`,
    projectId: project.id,
    email: email.toLowerCase(),
    role,
    invitedBy,
    expiresAt,
    status: "pending"
  };
}

export function buildAuditTrail(project) {
  return project.auditEvents.map((event, index) => ({
    sequence: index + 1,
    projectId: project.id,
    actorId: event.actorId,
    action: event.action,
    target: event.target,
    timestamp: event.timestamp
  }));
}

export function summarizeWorkspaceGovernance(users, projects) {
  const profiles = users.map(buildResearcherProfile);
  const projectSpaces = projects.map(buildProjectSpace);
  const publicProjects = projects.filter((project) => project.visibility === "public").length;
  const mfaUsers = profiles.filter((profile) => profile.mfaEnabled).length;
  return {
    userCount: users.length,
    projectCount: projects.length,
    publicProjectRate: Math.round((publicProjects / projects.length) * 100),
    mfaAdoptionRate: Math.round((mfaUsers / users.length) * 100),
    topResearchers: profiles
      .map((profile) => ({ userId: profile.id, score: profile.reputation.score }))
      .sort((a, b) => b.score - a.score),
    projectSpaces
  };
}
