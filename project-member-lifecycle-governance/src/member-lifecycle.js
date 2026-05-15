"use strict";

const crypto = require("node:crypto");

const ROLE_RANK = {
  viewer: 1,
  reviewer: 2,
  contributor: 3,
  maintainer: 4,
  manager: 5,
  owner: 6
};

const SENSITIVE_GRANTS = new Set(["dataset:admin", "dataset:write", "notebook:admin", "billing:approve", "review:approve"]);

function buildUserIndex(users) {
  return new Map(users.map((user) => [user.id, user]));
}

function evaluateWorkspace(workspace, options = {}) {
  validateWorkspace(workspace);
  const now = parseDate(options.now || workspace.generatedAt || new Date().toISOString());
  const users = buildUserIndex(workspace.users);
  const projects = workspace.projects.map((project) => evaluateProject(project, users, now));

  return {
    generatedAt: now.toISOString(),
    summary: summarize(projects),
    users: workspace.users.map((user) => ({
      id: user.id,
      name: user.name,
      status: user.status,
      riskScore: userRiskScore(user),
      verifiedIdentityCount: verifiedIdentityCount(user)
    })),
    projects
  };
}

function evaluateProject(project, users, now) {
  const members = project.members.map((member) => {
    const user = users.get(member.userId);
    if (!user) {
      throw new Error(`Project ${project.id} references unknown user ${member.userId}`);
    }
    return {
      ...member,
      user,
      riskScore: memberRiskScore(user, member)
    };
  });

  const ownerMembers = members.filter((member) => member.role === "owner");
  const activeOwners = ownerMembers.filter((member) => isActiveUser(member.user));
  const departingMembers = members.filter((member) => shouldOffboard(member.user, now));
  const transferPlans = buildTransferPlans(project, members, users, now);
  const revokedGrants = buildRevokedGrantActions(project, departingMembers);
  const invitationActions = buildInvitationActions(project, users, now);
  const objectTransferActions = buildObjectTransferActions(project, departingMembers, transferPlans);
  const blockers = buildBlockers(project, activeOwners, transferPlans);

  return {
    id: project.id,
    name: project.name,
    visibility: project.visibility,
    lifecycleRisk: projectRiskScore({
      activeOwners,
      departingMembers,
      transferPlans,
      invitationActions,
      revokedGrants,
      blockers
    }),
    activeOwnerCount: activeOwners.length,
    departingMemberIds: departingMembers.map((member) => member.userId),
    transferPlans,
    revokedGrants,
    invitationActions,
    objectTransferActions,
    blockers,
    auditEvents: buildAuditEvents(project, transferPlans, revokedGrants, invitationActions, objectTransferActions, blockers)
  };
}

function buildTransferPlans(project, members, users, now) {
  const plans = [];
  const candidates = members
    .filter((member) => isActiveUser(member.user))
    .filter((member) => ROLE_RANK[member.role] >= ROLE_RANK.maintainer)
    .sort((a, b) => bScore(b) - bScore(a) || a.user.name.localeCompare(b.user.name));

  for (const member of members) {
    if (!shouldOffboard(member.user, now)) {
      continue;
    }
    const needsOwnerTransfer = member.role === "owner";
    const sensitiveGrantCount = (member.objectGrants || []).filter((grant) => SENSITIVE_GRANTS.has(grant)).length;
    const replacement = candidates.find((candidate) => candidate.userId !== member.userId);
    if (needsOwnerTransfer || sensitiveGrantCount > 0) {
      plans.push({
        userId: member.userId,
        userName: member.user.name,
        reason: needsOwnerTransfer ? "owner-continuity" : "sensitive-grant-handoff",
        replacementUserId: replacement?.userId || null,
        replacementUserName: replacement?.user.name || null,
        status: replacement ? "ready" : "blocked",
        actions: [
          needsOwnerTransfer ? "assign replacement owner before removing member" : "transfer sensitive object grants",
          "record immutable access-review evidence",
          "notify project maintainers"
        ]
      });
    }
  }
  return plans;
}

function buildRevokedGrantActions(project, departingMembers) {
  const actions = [];
  for (const member of departingMembers) {
    for (const grant of member.objectGrants || []) {
      actions.push({
        userId: member.userId,
        grant,
        objectScope: grant.split(":")[0],
        revokeAt: member.user.departureDate || "immediate",
        reason: SENSITIVE_GRANTS.has(grant) ? "sensitive-access-offboarding" : "departing-member-cleanup"
      });
    }
  }
  return actions;
}

function buildInvitationActions(project, users, now) {
  return (project.invitations || [])
    .map((invitation) => {
      const sponsor = users.get(invitation.sponsorUserId);
      const expired = parseDate(invitation.expiresAt) < now;
      const sponsorDeparting = sponsor ? shouldOffboard(sponsor, now) : true;
      const risk = (expired ? 2 : 0) + (sponsorDeparting ? 2 : 0) + (invitation.external ? 1 : 0);
      return {
        invitationId: invitation.id,
        email: invitation.email,
        role: invitation.role,
        action: expired || sponsorDeparting ? "revoke" : "keep",
        risk,
        reasons: [
          expired ? "expired-invitation" : null,
          sponsorDeparting ? "sponsor-unavailable" : null,
          invitation.external ? "external-collaborator" : null
        ].filter(Boolean)
      };
    })
    .sort((a, b) => b.risk - a.risk || a.invitationId.localeCompare(b.invitationId));
}

function buildObjectTransferActions(project, departingMembers, transferPlans) {
  const planByUser = new Map(transferPlans.map((plan) => [plan.userId, plan]));
  const departingIds = new Set(departingMembers.map((member) => member.userId));
  return (project.objects || [])
    .filter((object) => departingIds.has(object.ownerUserId))
    .map((object) => {
      const plan = planByUser.get(object.ownerUserId);
      return {
        objectId: object.id,
        objectType: object.type,
        sensitivity: object.sensitivity,
        fromUserId: object.ownerUserId,
        toUserId: plan?.replacementUserId || null,
        action: plan?.replacementUserId ? "transfer-owner" : "quarantine-until-owner-assigned"
      };
    });
}

function buildBlockers(project, activeOwners, transferPlans) {
  const blockers = [];
  if (activeOwners.length === 0) {
    blockers.push({
      code: "missing-active-owner",
      severity: "critical",
      message: `${project.name} has no active owner.`
    });
  }
  for (const plan of transferPlans) {
    if (plan.status === "blocked") {
      blockers.push({
        code: "missing-transfer-recipient",
        severity: "high",
        message: `${plan.userName} cannot be removed until a replacement owner or sensitive-grant recipient is assigned.`
      });
    }
  }
  return blockers;
}

function buildAuditEvents(project, transferPlans, revokedGrants, invitationActions, objectTransferActions, blockers) {
  const events = [
    ...transferPlans.map((plan) => ({
      type: "transfer-plan",
      actor: "system",
      target: `${project.id}:${plan.userId}`,
      payload: plan
    })),
    ...revokedGrants.map((grant) => ({
      type: "grant-revocation",
      actor: "system",
      target: `${project.id}:${grant.userId}:${grant.grant}`,
      payload: grant
    })),
    ...invitationActions
      .filter((invite) => invite.action === "revoke")
      .map((invite) => ({
        type: "invitation-revocation",
        actor: "system",
        target: `${project.id}:${invite.invitationId}`,
        payload: invite
      })),
    ...objectTransferActions.map((object) => ({
      type: "object-transfer",
      actor: "system",
      target: `${project.id}:${object.objectId}`,
      payload: object
    })),
    ...blockers.map((blocker) => ({
      type: "offboarding-blocker",
      actor: "system",
      target: project.id,
      payload: blocker
    }))
  ];

  return events.map((event) => ({
    ...event,
    digest: digestEvent(event)
  }));
}

function summarize(projects) {
  return {
    projectCount: projects.length,
    projectsWithBlockers: projects.filter((project) => project.blockers.length > 0).length,
    transferPlanCount: projects.reduce((sum, project) => sum + project.transferPlans.length, 0),
    grantRevocationCount: projects.reduce((sum, project) => sum + project.revokedGrants.length, 0),
    invitationRevocationCount: projects.reduce(
      (sum, project) => sum + project.invitationActions.filter((invite) => invite.action === "revoke").length,
      0
    ),
    maxLifecycleRisk: Math.max(...projects.map((project) => project.lifecycleRisk), 0)
  };
}

function projectRiskScore(details) {
  const blockerScore = details.blockers.reduce((sum, blocker) => sum + (blocker.severity === "critical" ? 5 : 3), 0);
  const departingScore = details.departingMembers.length * 1.5;
  const transferScore = details.transferPlans.filter((plan) => plan.status === "blocked").length * 2;
  const inviteScore = details.invitationActions.filter((invite) => invite.action === "revoke").length * 0.75;
  const grantScore = details.revokedGrants.length * 0.4;
  const ownerCredit = details.activeOwners.length > 0 ? -1 : 0;
  return round(Math.max(0, blockerScore + departingScore + transferScore + inviteScore + grantScore + ownerCredit));
}

function memberRiskScore(user, member) {
  const sensitiveGrantCount = (member.objectGrants || []).filter((grant) => SENSITIVE_GRANTS.has(grant)).length;
  return round(userRiskScore(user) + sensitiveGrantCount * 0.75 + (ROLE_RANK[member.role] || 1) / 4);
}

function userRiskScore(user) {
  const statusRisk = user.status === "departing" ? 3 : user.status === "inactive" ? 4 : 0;
  const mfaRisk = user.mfaEnabled ? 0 : 2;
  const identityRisk = verifiedIdentityCount(user) === 0 ? 2 : (user.linkedIdentities || []).some((identity) => !identity.verified) ? 1 : 0;
  return round(statusRisk + mfaRisk + identityRisk + (user.anonymousProfile ? 0.25 : 0));
}

function verifiedIdentityCount(user) {
  return (user.linkedIdentities || []).filter((identity) => identity.verified).length;
}

function bScore(member) {
  const mfa = member.user.mfaEnabled ? 2 : 0;
  const identity = verifiedIdentityCount(member.user);
  return (ROLE_RANK[member.role] || 1) + mfa + identity - userRiskScore(member.user);
}

function shouldOffboard(user, now) {
  if (user.status === "inactive") {
    return true;
  }
  if (user.status !== "departing") {
    return false;
  }
  if (!user.departureDate) {
    return true;
  }
  const departure = parseDate(user.departureDate);
  const daysUntilDeparture = (departure.getTime() - now.getTime()) / 86_400_000;
  return daysUntilDeparture <= 14;
}

function isActiveUser(user) {
  return user.status === "active";
}

function parseDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

function digestEvent(event) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ type: event.type, target: event.target, payload: event.payload }))
    .digest("hex")
    .slice(0, 24);
}

function validateWorkspace(workspace) {
  if (!Array.isArray(workspace.users) || !Array.isArray(workspace.projects)) {
    throw new Error("workspace must include users and projects arrays");
  }
}

function round(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  evaluateWorkspace,
  userRiskScore,
  verifiedIdentityCount
};
