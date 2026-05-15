"use strict";

const crypto = require("node:crypto");

const ELEVATED_ROLES = new Set(["owner", "admin", "editor", "data-steward"]);

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function requireFields(object, fields, label) {
  const missing = fields.filter((field) => object[field] === undefined || object[field] === null);
  if (missing.length > 0) {
    throw new Error(`${label} is missing required field(s): ${missing.join(", ")}`);
  }
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
  return parsed;
}

function daysBetween(earlier, later) {
  return Math.floor((later.getTime() - earlier.getTime()) / 86400000);
}

function finding(severity, id, memberId, title, detail, remediation) {
  return { severity, id, memberId, title, detail, remediation };
}

function assertBundle(bundle) {
  requireFields(bundle, ["project", "members", "objectPolicies"], "access review bundle");
  requireFields(bundle.project, [
    "id",
    "name",
    "allowedInstitutionDomains",
    "requiredTraining",
    "requiredIrbProtocols",
    "reviewIntervalDays",
  ], "project");
}

function hasElevatedRole(member) {
  return member.roles.some((role) => ELEVATED_ROLES.has(role));
}

function isExpired(dateValue, now) {
  const date = parseDate(dateValue);
  return !date || date <= now;
}

function hasCurrentTraining(member, trainingName, now) {
  return member.trainingCertifications.some((certification) => {
    return certification.name === trainingName && !isExpired(certification.expiresAt, now);
  });
}

function hasCurrentIrb(member, protocolId, now) {
  return member.irbApprovals.some((approval) => {
    return approval.protocolId === protocolId && !isExpired(approval.expiresAt, now);
  });
}

function evaluateIdentity(member, project, now) {
  const findings = [];
  const allowedDomain = project.allowedInstitutionDomains.includes(member.institutionDomain);

  if (!allowedDomain && !member.externalSponsor) {
    findings.push(finding(
      "blocker",
      "external-sponsor-missing",
      member.id,
      "External collaborator has no named sponsor",
      `${member.primaryEmail} uses ${member.institutionDomain}, which is outside the approved institution domains.`,
      "Assign an internal sponsor or remove project access until sponsorship is documented.",
    ));
  }

  if (hasElevatedRole(member) && isExpired(member.samlAssertionExpiresAt, now)) {
    findings.push(finding(
      "blocker",
      "saml-assertion-expired",
      member.id,
      "Elevated role has expired institutional assertion",
      `${member.primaryEmail} holds ${member.roles.join(", ")} but the SAML assertion is expired or missing.`,
      "Refresh institutional SSO evidence before renewing elevated project roles.",
    ));
  }

  if (hasElevatedRole(member) && !member.mfaEnabled) {
    findings.push(finding(
      "blocker",
      "mfa-required-for-elevated-role",
      member.id,
      "Elevated project access lacks MFA",
      `${member.primaryEmail} has elevated roles without multi-factor authentication.`,
      "Require MFA before retaining owner, admin, editor, or data-steward access.",
    ));
  }

  if (!member.orcidVerifiedAt) {
    findings.push(finding(
      "warning",
      "orcid-verification-missing",
      member.id,
      "Research identity has no verified ORCID link",
      `${member.primaryEmail} is missing a verified ORCID timestamp.`,
      "Verify ORCID before the next access review cycle.",
    ));
  }

  return findings;
}

function evaluateComplianceEvidence(member, project, now) {
  const findings = [];

  for (const trainingName of project.requiredTraining) {
    if (!hasCurrentTraining(member, trainingName, now)) {
      findings.push(finding(
        "blocker",
        "training-expired-or-missing",
        member.id,
        "Required collaborator training is expired or missing",
        `${member.primaryEmail} lacks current ${trainingName} certification.`,
        "Collect current training evidence before renewing access.",
      ));
    }
  }

  for (const protocolId of project.requiredIrbProtocols) {
    if (!hasCurrentIrb(member, protocolId, now)) {
      findings.push(finding(
        "blocker",
        "irb-approval-expired-or-missing",
        member.id,
        "Required IRB approval is expired or missing",
        `${member.primaryEmail} lacks current approval for ${protocolId}.`,
        "Confirm IRB coverage or remove access to regulated project objects.",
      ));
    }
  }

  return findings;
}

function evaluateReviewWindow(member, project, now) {
  const findings = [];
  const lastReviewedAt = parseDate(member.lastAccessReviewAt);
  const daysSinceReview = lastReviewedAt ? daysBetween(lastReviewedAt, now) : Infinity;

  if (daysSinceReview > project.reviewIntervalDays) {
    findings.push(finding(
      member.external ? "blocker" : "warning",
      "access-review-overdue",
      member.id,
      "Access recertification window is overdue",
      `${member.primaryEmail} was last reviewed ${Number.isFinite(daysSinceReview) ? daysSinceReview : "never"} days ago.`,
      "Run sponsor recertification and record the review decision.",
    ));
  }

  if (member.invitationStatus === "pending") {
    const invitedAt = parseDate(member.invitedAt);
    const ageDays = invitedAt ? daysBetween(invitedAt, now) : Infinity;
    if (ageDays > project.pendingInvitationTtlDays) {
      findings.push(finding(
        "warning",
        "stale-invitation",
        member.id,
        "Pending project invitation is stale",
        `${member.primaryEmail} has a pending invitation older than ${project.pendingInvitationTtlDays} days.`,
        "Expire the invitation or ask the sponsor to resend it with fresh justification.",
      ));
    }
  }

  return findings;
}

function evaluateObjectGrants(member, objectPolicies) {
  const findings = [];

  for (const grant of member.objectGrants) {
    const policy = objectPolicies.find((item) => item.objectId === grant.objectId);
    if (!policy) {
      findings.push(finding(
        "blocker",
        "unknown-object-grant",
        member.id,
        "Object grant points to an unknown object",
        `${member.primaryEmail} has ${grant.permission} on ${grant.objectId}, which has no policy record.`,
        "Remove the grant or register the object policy before recertification.",
      ));
      continue;
    }

    const allowed = policy.allowedRoles.some((role) => member.roles.includes(role));
    if (!allowed) {
      findings.push(finding(
        "blocker",
        "object-grant-exceeds-role",
        member.id,
        "Object-level grant exceeds member role policy",
        `${member.primaryEmail} has ${grant.permission} on ${grant.objectId} without one of: ${policy.allowedRoles.join(", ")}.`,
        "Revoke the object grant or assign a role explicitly allowed by the object policy.",
      ));
    }
  }

  return findings;
}

function summarizeMember(member, findings) {
  const memberFindings = findings.filter((item) => item.memberId === member.id);
  const blockerCount = memberFindings.filter((item) => item.severity === "blocker").length;
  const warningCount = memberFindings.filter((item) => item.severity === "warning").length;
  let action = "renew";

  if (blockerCount > 0) {
    action = member.external ? "revoke-until-recertified" : "renew-after-evidence";
  } else if (warningCount > 0) {
    action = "manual-review";
  }

  return {
    memberId: member.id,
    email: member.primaryEmail,
    roles: member.roles,
    external: member.external,
    blockerCount,
    warningCount,
    recommendedAction: action,
  };
}

function decide(findings) {
  if (findings.some((item) => item.severity === "blocker")) return "access-changes-required";
  if (findings.some((item) => item.severity === "warning")) return "manual-review";
  return "recertified";
}

function analyzeInstitutionalAccess(bundle, options = {}) {
  assertBundle(bundle);
  const now = parseDate(options.now || bundle.now || new Date().toISOString());
  const findings = [];

  for (const member of bundle.members) {
    requireFields(member, [
      "id",
      "primaryEmail",
      "institutionDomain",
      "roles",
      "trainingCertifications",
      "irbApprovals",
      "objectGrants",
    ], `member ${member.id || "(unknown)"}`);
    findings.push(...evaluateIdentity(member, bundle.project, now));
    findings.push(...evaluateComplianceEvidence(member, bundle.project, now));
    findings.push(...evaluateReviewWindow(member, bundle.project, now));
    findings.push(...evaluateObjectGrants(member, bundle.objectPolicies));
  }

  const memberActions = bundle.members.map((member) => summarizeMember(member, findings));
  const decision = decide(findings);
  const auditDigest = stableHash({
    projectId: bundle.project.id,
    decision,
    memberActions,
    findings,
    evaluatedAt: now.toISOString(),
  });

  return {
    projectId: bundle.project.id,
    projectName: bundle.project.name,
    evaluatedAt: now.toISOString(),
    decision,
    findings,
    memberActions,
    auditDigest: `sha256:${auditDigest}`,
  };
}

module.exports = {
  analyzeInstitutionalAccess,
  stableHash,
  stableStringify,
};
