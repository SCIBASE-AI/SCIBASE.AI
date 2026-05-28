"use strict";

const crypto = require("crypto");

const ROLE_RANK = {
  viewer: 1,
  reviewer: 2,
  contributor: 3,
  admin: 4,
  owner: 5,
};

const WEIGHTS = {
  critical: 26,
  high: 18,
  medium: 10,
  low: 5,
};

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity || "medium",
    recommendation: recommendationFor(finding.code),
    ...finding,
  });
}

function recommendationFor(code) {
  const recommendations = {
    EXPIRED_INVITE_ACTIVE: "Disable the invitation and rotate the access token.",
    ROLE_ESCALATION_WITHOUT_APPROVAL: "Require owner approval before increasing collaborator role scope.",
    OBJECT_PERMISSION_BYPASS: "Apply object-level deny rules before project-level role grants.",
    INSTITUTION_SCOPE_MISMATCH: "Restrict institutional-only access to verified SAML domains.",
    UNVERIFIED_IDENTITY_PRIVILEGE: "Require ORCID or institutional verification before granting elevated roles.",
    ANONYMOUS_PRIVATE_ACCESS: "Block anonymous sessions from private or invitation-only workspaces.",
    AUDIT_LOG_GAP: "Write an immutable audit-log event for every invite, role, and object-permission change.",
    DATA_DOWNLOAD_NOT_RESTRICTED: "Set explicit deny-download policy for restricted datasets.",
    STALE_EXTERNAL_COLLABORATOR: "Expire external collaborator access after inactivity or invite window close.",
  };
  return recommendations[code] || "Route this item for project-access review.";
}

function auditAccessPolicy(project, options = {}) {
  const now = new Date(options.now || project.auditTime || new Date().toISOString());
  const findings = [];
  const auditEventKeys = new Set((project.auditLog || []).map((event) => event.key));
  const identities = new Map((project.identities || []).map((identity) => [identity.userId, identity]));
  const objectRules = project.objectPermissions || [];

  for (const invite of project.invitations || []) {
    if (invite.status === "active" && new Date(invite.expiresAt).getTime() < now.getTime()) {
      addFinding(findings, {
        code: "EXPIRED_INVITE_ACTIVE",
        severity: "critical",
        inviteId: invite.id,
        userId: invite.userId,
        message: `Invitation ${invite.id} is active after expiry ${invite.expiresAt}.`,
        evidence: invite,
      });
    }

    if (invite.role && invite.requestedRole && roleRank(invite.role) > roleRank(invite.requestedRole) && !invite.ownerApprovalId) {
      addFinding(findings, {
        code: "ROLE_ESCALATION_WITHOUT_APPROVAL",
        severity: "high",
        inviteId: invite.id,
        userId: invite.userId,
        message: `Invitation ${invite.id} grants ${invite.role} after ${invite.requestedRole} request without owner approval.`,
        evidence: invite,
      });
    }

    const identity = identities.get(invite.userId);
    if (["admin", "owner", "contributor"].includes(invite.role) && (!identity || (!identity.orcidVerified && !identity.samlVerified))) {
      addFinding(findings, {
        code: "UNVERIFIED_IDENTITY_PRIVILEGE",
        severity: "high",
        inviteId: invite.id,
        userId: invite.userId,
        message: `${invite.userId} has elevated role ${invite.role} without verified ORCID or SAML identity.`,
        evidence: { invite, identity },
      });
    }

    if (!auditEventKeys.has(`invite:${invite.id}`)) {
      addFinding(findings, {
        code: "AUDIT_LOG_GAP",
        severity: "medium",
        inviteId: invite.id,
        userId: invite.userId,
        message: `Invitation ${invite.id} has no immutable audit-log event.`,
        evidence: invite,
      });
    }
  }

  for (const membership of project.memberships || []) {
    const identity = identities.get(membership.userId);
    if (project.visibility === "institutional-only" && (!identity?.samlVerified || identity.institutionDomain !== project.institutionDomain)) {
      addFinding(findings, {
        code: "INSTITUTION_SCOPE_MISMATCH",
        severity: "critical",
        userId: membership.userId,
        message: `${membership.userId} has institutional-only access without matching verified SAML domain.`,
        evidence: { membership, identity, institutionDomain: project.institutionDomain },
      });
    }

    if (membership.anonymous && ["private", "invitation-only", "institutional-only"].includes(project.visibility)) {
      addFinding(findings, {
        code: "ANONYMOUS_PRIVATE_ACCESS",
        severity: "critical",
        userId: membership.userId,
        message: `Anonymous membership ${membership.userId} can access ${project.visibility} project.`,
        evidence: membership,
      });
    }

    const inactiveDays = daysBetween(membership.lastActiveAt, now.toISOString());
    if (membership.external && inactiveDays > (project.policy?.externalInactivityLimitDays || 30) && membership.role !== "viewer") {
      addFinding(findings, {
        code: "STALE_EXTERNAL_COLLABORATOR",
        severity: "medium",
        userId: membership.userId,
        message: `External collaborator ${membership.userId} has ${inactiveDays} inactive days with ${membership.role} role.`,
        evidence: membership,
      });
    }

    if (!auditEventKeys.has(`member:${membership.userId}:${membership.role}`)) {
      addFinding(findings, {
        code: "AUDIT_LOG_GAP",
        severity: "medium",
        userId: membership.userId,
        message: `Membership ${membership.userId}/${membership.role} has no role audit-log event.`,
        evidence: membership,
      });
    }
  }

  for (const rule of objectRules) {
    const membership = (project.memberships || []).find((entry) => entry.userId === rule.userId);
    if (!membership) continue;

    if (rule.objectType === "dataset" && rule.action === "download" && rule.effect === "allow" && project.restrictedDatasets?.includes(rule.objectId)) {
      addFinding(findings, {
        code: "OBJECT_PERMISSION_BYPASS",
        severity: "critical",
        userId: rule.userId,
        objectId: rule.objectId,
        message: `${rule.userId} can download restricted dataset ${rule.objectId}.`,
        evidence: { rule, membership },
      });
    }

    if (rule.objectType === "dataset" && project.restrictedDatasets?.includes(rule.objectId)) {
      const hasExplicitDeny = objectRules.some(
        (candidate) =>
          candidate.objectId === rule.objectId &&
          candidate.userId === rule.userId &&
          candidate.action === "download" &&
          candidate.effect === "deny"
      );
      if (!hasExplicitDeny) {
        addFinding(findings, {
          code: "DATA_DOWNLOAD_NOT_RESTRICTED",
          severity: "high",
          userId: rule.userId,
          objectId: rule.objectId,
          message: `${rule.objectId} lacks explicit download deny for ${rule.userId}.`,
          evidence: rule,
        });
      }
    }

    if (!auditEventKeys.has(`object:${rule.id}`)) {
      addFinding(findings, {
        code: "AUDIT_LOG_GAP",
        severity: "low",
        userId: rule.userId,
        objectId: rule.objectId,
        message: `Object permission ${rule.id} has no audit-log event.`,
        evidence: rule,
      });
    }
  }

  const riskScore = Math.min(100, findings.reduce((score, finding) => score + WEIGHTS[finding.severity], 0));
  const decision = riskScore >= 70 ? "hold-project-access" : riskScore >= 35 ? "repair-access-policy" : "access-policy-ready";
  const auditDigest = crypto
    .createHash("sha256")
    .update(JSON.stringify(findings.map((finding) => [finding.code, finding.inviteId, finding.userId, finding.objectId]).sort()))
    .digest("hex")
    .slice(0, 16);

  return {
    project: {
      id: project.id,
      title: project.title,
      visibility: project.visibility,
    },
    summary: {
      decision,
      riskScore,
      auditDigest,
      invitationsReviewed: (project.invitations || []).length,
      membershipsReviewed: (project.memberships || []).length,
      objectPermissionsReviewed: objectRules.length,
      findings: findings.length,
      criticalFindings: findings.filter((finding) => finding.severity === "critical").length,
      highFindings: findings.filter((finding) => finding.severity === "high").length,
    },
    findings,
    accessGates: [
      { gate: "Invitations expire and cannot silently escalate roles.", passed: !findings.some((finding) => ["EXPIRED_INVITE_ACTIVE", "ROLE_ESCALATION_WITHOUT_APPROVAL"].includes(finding.code)) },
      { gate: "Institutional and private workspaces reject anonymous or mismatched identities.", passed: !findings.some((finding) => ["INSTITUTION_SCOPE_MISMATCH", "ANONYMOUS_PRIVATE_ACCESS"].includes(finding.code)) },
      { gate: "Restricted datasets cannot be downloaded by object-permission bypass.", passed: !findings.some((finding) => ["OBJECT_PERMISSION_BYPASS", "DATA_DOWNLOAD_NOT_RESTRICTED"].includes(finding.code)) },
      { gate: "Elevated roles require verified identity.", passed: !findings.some((finding) => finding.code === "UNVERIFIED_IDENTITY_PRIVILEGE") },
      { gate: "Invite, membership, and object-permission changes are audit logged.", passed: !findings.some((finding) => finding.code === "AUDIT_LOG_GAP") },
    ],
  };
}

function roleRank(role) {
  return ROLE_RANK[String(role || "").toLowerCase()] || 0;
}

function daysBetween(leftIso, rightIso) {
  return Math.round((new Date(rightIso).getTime() - new Date(leftIso).getTime()) / 86400000);
}

function renderMarkdownReport(report) {
  const lines = [
    `# Access Invitation Policy Audit: ${report.project.title}`,
    "",
    `- Decision: ${report.summary.decision}`,
    `- Risk score: ${report.summary.riskScore}`,
    `- Visibility: ${report.project.visibility}`,
    `- Invitations reviewed: ${report.summary.invitationsReviewed}`,
    `- Memberships reviewed: ${report.summary.membershipsReviewed}`,
    `- Object permissions reviewed: ${report.summary.objectPermissionsReviewed}`,
    `- Audit digest: ${report.summary.auditDigest}`,
    "",
    "## Findings",
    "",
  ];

  for (const finding of report.findings) {
    lines.push(`- [${finding.severity}] ${finding.code}${finding.userId ? ` (${finding.userId})` : ""}`);
    lines.push(`  - ${finding.message}`);
    lines.push(`  - Recommendation: ${finding.recommendation}`);
  }

  lines.push("", "## Access Gates", "");
  for (const gate of report.accessGates) {
    lines.push(`- [${gate.passed ? "x" : "!"}] ${gate.gate}`);
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  auditAccessPolicy,
  renderMarkdownReport,
  roleRank,
  daysBetween,
};
