const ROLE_RANK = {
  viewer: 1,
  reviewer: 2,
  contributor: 3,
  admin: 4,
  owner: 5
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export function buildIdentityRecord(user) {
  const verifiedProviders = user.linkedAccounts.filter((account) => account.verified).map((account) => account.provider);
  const hasInstitutionalLogin = user.linkedAccounts.some((account) => account.provider === "saml" && account.verified);
  const assuranceLevel = user.anonymous
    ? "anonymous"
    : user.mfaEnabled && hasInstitutionalLogin
      ? "institutional-mfa"
      : user.mfaEnabled
        ? "verified-mfa"
        : "basic";
  return {
    id: user.id,
    email: user.anonymous ? null : user.email,
    anonymous: user.anonymous,
    mfaEnabled: user.mfaEnabled,
    verifiedProviders,
    hasInstitutionalLogin,
    assuranceLevel,
    accountLinkCount: user.linkedAccounts.length
  };
}

export function calculateReputationScore(metrics) {
  const citationScore = Math.min(30, Math.round(metrics.citations / 60));
  const downloadScore = Math.min(15, Math.round(metrics.downloads / 80));
  const forkScore = Math.min(15, metrics.forks);
  const endorsementScore = Math.min(15, Math.round(metrics.endorsements / 3));
  const reviewScore = Math.min(10, metrics.peerReviews);
  const reproducibilityScore = Math.round(metrics.reproducibilityScore * 0.15);
  return citationScore + downloadScore + forkScore + endorsementScore + reviewScore + reproducibilityScore;
}

export function buildResearcherProfile(user) {
  return {
    userId: user.id,
    ...clone(user.profile),
    reputationScore: calculateReputationScore(user.profile.metrics),
    syncedFromOrcid: user.linkedAccounts.some((account) => account.provider === "orcid" && account.verified)
  };
}

export function buildProjectSpace(project) {
  return {
    id: project.id,
    title: project.title,
    visibility: project.visibility,
    ownerId: project.ownerId,
    counts: {
      collaborators: project.collaborators.length,
      objects: project.objects.length,
      discussions: project.discussions.length,
      citations: project.citations.length
    },
    objectIndex: Object.fromEntries(project.objects.map((object) => [object.id, { type: object.type, policy: object.policy }])),
    governance: {
      institutions: project.institutions,
      fundingSources: project.fundingSources,
      metadata: project.metadata
    }
  };
}

export function getProjectRole(project, userId) {
  return project.collaborators.find((collaborator) => collaborator.userId === userId)?.role ?? null;
}

function roleMeets(role, minimumRole) {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minimumRole] ?? 99);
}

function visibilityAllows(project, identity) {
  if (project.visibility === "public") return true;
  if (project.visibility === "private") return getProjectRole(project, identity.id) != null;
  if (project.visibility === "institutional-only") return identity.hasInstitutionalLogin || getProjectRole(project, identity.id) != null;
  if (project.visibility === "invitation-only") return getProjectRole(project, identity.id) != null;
  return false;
}

export function evaluateAccess({ project, user, objectId, action }) {
  const identity = buildIdentityRecord(user);
  const object = project.objects.find((item) => item.id === objectId);
  if (!object) return { allowed: false, reason: "object-not-found" };
  if (!visibilityAllows(project, identity)) return { allowed: false, reason: "project-visibility-denied" };
  const role = getProjectRole(project, user.id) ?? (identity.hasInstitutionalLogin ? "viewer" : null);
  if (!role) return { allowed: false, reason: "no-project-role" };
  const allowedRoles = object.policy[action] ?? [];
  const allowed = allowedRoles.some((minimumRole) => roleMeets(role, minimumRole));
  return {
    allowed,
    reason: allowed ? "allowed" : "object-policy-denied",
    role,
    assuranceLevel: identity.assuranceLevel,
    objectType: object.type
  };
}

export function createInvitation(invitation) {
  return {
    ...clone(invitation),
    status: "pending",
    createdAt: "2026-05-14T00:00:00Z",
    tokenPreview: `invite_${invitation.id.slice(0, 8)}`
  };
}

export function isInvitationActive(invitation, now = "2026-05-14T00:00:00Z") {
  return invitation.status !== "revoked" && new Date(invitation.expiresAt).getTime() > new Date(now).getTime();
}

export function appendAuditEvent(auditLog, event) {
  return [
    ...auditLog,
    {
      at: event.at ?? "2026-05-14T00:00:00Z",
      actorId: event.actorId,
      action: event.action,
      target: event.target,
      metadata: event.metadata ?? {}
    }
  ];
}

export function buildGovernanceDashboard({ user, project, invitation, auditLog }) {
  const identity = buildIdentityRecord(user);
  const profile = buildResearcherProfile(user);
  const space = buildProjectSpace(project);
  const invite = createInvitation(invitation);
  const accessChecks = project.objects.flatMap((object) =>
    ["read", "write", "download"].map((action) => ({
      objectId: object.id,
      action,
      ...evaluateAccess({ project, user, objectId: object.id, action })
    }))
  );
  return {
    identity,
    profile,
    project: space,
    invitation: {
      ...invite,
      active: isInvitationActive(invite)
    },
    accessChecks,
    auditLog,
    summary: {
      reputationScore: profile.reputationScore,
      allowedActions: accessChecks.filter((check) => check.allowed).length,
      deniedActions: accessChecks.filter((check) => !check.allowed).length,
      auditEvents: auditLog.length
    }
  };
}
