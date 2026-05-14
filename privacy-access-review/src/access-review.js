import { createHash } from "node:crypto";

const ROLE_WEIGHT = {
  viewer: 1,
  reviewer: 2,
  contributor: 3,
  admin: 4,
  owner: 5
};

const HIGH_RISK_ACTIONS = new Set(["download", "manage", "audit"]);

export function evaluateAccess({ project, users, userKey, objectKey, action, now = new Date().toISOString() }) {
  const user = requireUser(users, userKey);
  const object = requireObject(project, objectKey);
  const membership = project.memberships.find((entry) => entry.userId === user.id);
  const reasons = [];
  const warnings = [];

  if (!membership) {
    return denyDecision(user, object, action, ["No project membership"], warnings, now);
  }

  if (membership.status !== "active") {
    return denyDecision(user, object, action, [`Membership status is ${membership.status}`], warnings, now, membership);
  }

  if (!passesVisibility(project, user)) {
    reasons.push(`Project visibility ${project.visibility} does not permit this user`);
  }

  const allowedActions = object.allowedActionsByRole[membership.role] ?? [];
  if (!allowedActions.includes(action)) {
    reasons.push(`Role ${membership.role} cannot ${action} ${object.type} objects`);
  }

  if (object.requiresMfa && HIGH_RISK_ACTIONS.has(action) && !user.mfaEnabled) {
    reasons.push(`${action} requires MFA for ${object.sensitivity} object`);
  }

  if (object.preserveAnonymity && user.profileMode !== "anonymous-review" && membership.role === "contributor") {
    reasons.push("Contributor access would expose double-blind review identity");
  }

  if (user.profileMode === "anonymous-review" && action === "audit") {
    reasons.push("Anonymous reviewers cannot access audit trails");
  }

  if (!hasVerifiedIdentity(user, "orcid") && membership.role !== "viewer") {
    warnings.push("ORCID identity is missing or unverified");
  }

  if (HIGH_RISK_ACTIONS.has(action) && !user.mfaEnabled) {
    warnings.push("MFA is disabled for high-risk action");
  }

  const allowed = reasons.length === 0;
  return {
    allowed,
    decision: allowed ? "allow" : "deny",
    user: redactUser(user),
    object: summarizeObject(object),
    action,
    role: membership.role,
    reasons: allowed ? ["Policy requirements satisfied"] : reasons,
    warnings,
    riskScore: scoreAccessRisk({ user, object, action, membership, denied: !allowed }),
    evidenceHash: hashDecision({ userId: user.id, objectId: object.id, action, allowed, reasons, warnings, now })
  };
}

export function evaluateInvitationRisk({ project, users, inviteKey, now = new Date().toISOString() }) {
  const invite = project.invitations[inviteKey];
  if (!invite) {
    throw new Error(`Unknown invitation: ${inviteKey}`);
  }

  const invitedUser = Object.values(users).find((user) =>
    user.identities.some((identity) => identity.provider === "email" && identity.value === invite.email)
  );
  const expiresAt = new Date(invite.expiresAt);
  const current = new Date(now);
  const findings = [];
  const scopedObjects = invite.objectScopes.map((objectKey) => requireObject(project, objectKey));

  if (expiresAt <= current) {
    findings.push({ severity: "critical", message: "Invitation is expired and should be revoked" });
  }

  if (!emailMatchesInstitution(invite.email, project.institution)) {
    findings.push({ severity: "medium", message: "Invitee email is outside the project institution" });
  }

  if (ROLE_WEIGHT[invite.role] >= ROLE_WEIGHT.contributor && !invite.readOnly) {
    findings.push({ severity: "high", message: "External non-read-only contributor invite requires admin review" });
  }

  if (scopedObjects.some((object) => object.sensitivity === "restricted") && !invite.requireMfaBeforeDownload) {
    findings.push({ severity: "high", message: "Restricted object scope needs MFA before download" });
  }

  if (invitedUser && !invitedUser.mfaEnabled && scopedObjects.some((object) => object.requiresMfa)) {
    findings.push({ severity: "medium", message: "Invitee has not enabled MFA for scoped sensitive objects" });
  }

  return {
    invitation: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      objectScopes: invite.objectScopes,
      readOnly: invite.readOnly
    },
    status: findings.some((finding) => finding.severity === "critical") ? "revoke" : findings.length > 0 ? "review" : "approve",
    riskScore: scoreInvitationRisk(findings, invite),
    findings,
    evidenceHash: checksumObject({ invite, findings, now })
  };
}

export function buildProfilePrivacyReport(users) {
  return Object.entries(users).map(([key, user]) => {
    const verifiedProviders = user.identities.filter((identity) => identity.verified).map((identity) => identity.provider);
    const findings = [];

    if (!verifiedProviders.includes("orcid") && user.profileMode !== "anonymous-review") {
      findings.push("ORCID sync is incomplete");
    }

    if (!user.mfaEnabled && user.profileMode !== "public") {
      findings.push("MFA should be enabled for non-public profile modes");
    }

    if (user.profileMode === "anonymous-review") {
      findings.push("Profile must redact direct identity in author-facing views");
    }

    return {
      key,
      user: redactUser(user),
      verifiedProviders,
      profileMode: user.profileMode,
      posture: findings.length === 0 ? "healthy" : "needs_review",
      findings
    };
  });
}

export function buildAuditEvidence(project) {
  const events = project.auditEvents.map((event) => ({
    ...event,
    hash: checksumObject(event)
  }));

  return {
    projectId: project.id,
    eventCount: events.length,
    latestEventAt: events.map((event) => event.timestamp).sort().at(-1),
    chainHash: checksumObject(events.map((event) => event.hash)),
    events
  };
}

export function buildAccessReviewCampaign({ project, users, now }) {
  const decisions = [];

  for (const [userKey] of Object.entries(users)) {
    for (const objectKey of Object.keys(project.objects)) {
      for (const action of ["read", "download", "edit", "audit"]) {
        decisions.push(evaluateAccess({ project, users, userKey, objectKey, action, now }));
      }
    }
  }

  const denied = decisions.filter((decision) => !decision.allowed);
  const highRiskAllows = decisions.filter((decision) => decision.allowed && decision.riskScore >= 50);
  const staleInvites = Object.keys(project.invitations)
    .map((inviteKey) => evaluateInvitationRisk({ project, users, inviteKey, now }))
    .filter((invite) => invite.status !== "approve");

  return {
    projectId: project.id,
    reviewedAt: now,
    decisionCount: decisions.length,
    deniedCount: denied.length,
    highRiskAllowCount: highRiskAllows.length,
    invitationReviewCount: staleInvites.length,
    recommendations: [
      ...highRiskAllows.map((decision) => ({
        type: "review-high-risk-access",
        message: `${decision.user.displayName} can ${decision.action} ${decision.object.label}`,
        evidenceHash: decision.evidenceHash
      })),
      ...staleInvites.map((invite) => ({
        type: invite.status === "revoke" ? "revoke-invitation" : "review-invitation",
        message: `${invite.invitation.id} requires ${invite.status}`,
        evidenceHash: invite.evidenceHash
      }))
    ]
  };
}

export function buildDashboard({ project, users, now }) {
  const campaign = buildAccessReviewCampaign({ project, users, now });
  const audit = buildAuditEvidence(project);
  const profileReports = buildProfilePrivacyReport(users);
  const invitations = Object.keys(project.invitations).map((inviteKey) =>
    evaluateInvitationRisk({ project, users, inviteKey, now })
  );

  return {
    project: {
      id: project.id,
      title: project.title,
      visibility: project.visibility,
      institution: project.institution
    },
    summary: {
      members: project.memberships.length,
      activeMembers: project.memberships.filter((membership) => membership.status === "active").length,
      objects: Object.keys(project.objects).length,
      invitations: Object.keys(project.invitations).length,
      profileReportsNeedingReview: profileReports.filter((report) => report.posture !== "healthy").length,
      accessReviewRecommendations: campaign.recommendations.length,
      auditEvents: audit.eventCount
    },
    profileReports,
    invitations,
    accessReviewCampaign: campaign,
    audit
  };
}

function denyDecision(user, object, action, reasons, warnings, now, membership = null) {
  return {
    allowed: false,
    decision: "deny",
    user: redactUser(user),
    object: summarizeObject(object),
    action,
    role: membership?.role ?? "none",
    reasons,
    warnings,
    riskScore: scoreAccessRisk({ user, object, action, membership, denied: true }),
    evidenceHash: hashDecision({ userId: user.id, objectId: object.id, action, allowed: false, reasons, warnings, now })
  };
}

function scoreAccessRisk({ user, object, action, membership, denied }) {
  let score = object.sensitivity === "restricted" ? 30 : object.sensitivity === "anonymous" ? 25 : 10;
  score += HIGH_RISK_ACTIONS.has(action) ? 25 : 0;
  score += user.mfaEnabled ? -10 : 15;
  score += membership?.status === "active" ? 0 : 20;
  score += denied ? 10 : 0;
  score += user.profileMode === "anonymous-review" && action !== "review" ? 10 : 0;
  return Math.max(0, Math.min(100, score));
}

function scoreInvitationRisk(findings, invite) {
  const severityScore = findings.reduce((total, finding) => {
    if (finding.severity === "critical") return total + 50;
    if (finding.severity === "high") return total + 30;
    if (finding.severity === "medium") return total + 15;
    return total + 5;
  }, 0);
  const roleScore = ROLE_WEIGHT[invite.role] * 5;
  return Math.min(100, severityScore + roleScore);
}

function passesVisibility(project, user) {
  if (project.visibility === "public") return true;
  if (project.visibility === "private") return user.id === project.ownerId;
  if (project.visibility === "institutional-only") return user.institution === project.institution;
  if (project.visibility === "invitation-only") {
    return project.memberships.some((membership) => membership.userId === user.id);
  }
  return false;
}

function emailMatchesInstitution(email, institution) {
  if (!institution) return false;
  const domainHint = institution.toLowerCase().split(/\s+/)[0];
  return email.toLowerCase().includes(domainHint);
}

function hasVerifiedIdentity(user, provider) {
  return user.identities.some((identity) => identity.provider === provider && identity.verified);
}

function requireUser(users, userKey) {
  const user = users[userKey];
  if (!user) {
    throw new Error(`Unknown user: ${userKey}`);
  }
  return user;
}

function requireObject(project, objectKey) {
  const object = project.objects[objectKey];
  if (!object) {
    throw new Error(`Unknown object: ${objectKey}`);
  }
  return object;
}

function redactUser(user) {
  return {
    id: user.id,
    displayName: user.profileMode === "anonymous-review" ? "Anonymous reviewer" : user.name,
    profileMode: user.profileMode,
    institution: user.profileMode === "anonymous-review" ? "redacted" : user.institution,
    mfaEnabled: user.mfaEnabled,
    reputationScore: user.reputationScore
  };
}

function summarizeObject(object) {
  return {
    id: object.id,
    label: object.label,
    type: object.type,
    sensitivity: object.sensitivity
  };
}

function hashDecision(value) {
  return checksumObject(value);
}

function checksumObject(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
