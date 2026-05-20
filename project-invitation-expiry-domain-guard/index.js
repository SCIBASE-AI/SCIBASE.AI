"use strict";

function domainOf(email) {
  const parts = String(email || "").toLowerCase().split("@");
  if (parts.length !== 2 || !parts[1]) {
    throw new Error(`Invalid invitation email: ${email}`);
  }
  return parts[1];
}

function isExpired(invite, evaluatedAt) {
  const now = new Date(evaluatedAt).getTime();
  const expiresAt = new Date(invite.expiresAt).getTime();
  if (Number.isNaN(now) || Number.isNaN(expiresAt)) {
    throw new Error(`Invalid invitation expiry timestamp for ${invite.inviteId}`);
  }
  return expiresAt <= now;
}

function findInviter(packet, inviterId) {
  return packet.inviters.find((inviter) => inviter.userId === inviterId) || null;
}

function duplicateEmails(invitations) {
  const counts = new Map();
  for (const invite of invitations) {
    const email = String(invite.email).toLowerCase();
    counts.set(email, (counts.get(email) || 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([email]) => email));
}

function evaluateInvitation(packet, invite, duplicateEmailSet) {
  const holds = [];
  const domain = domainOf(invite.email);
  const inviter = findInviter(packet, invite.invitedBy);

  if (isExpired(invite, packet.evaluatedAt)) {
    holds.push("expired-invitation");
  }
  if (!packet.allowedDomains.includes(domain)) {
    holds.push("domain-not-allowed");
  }
  if (!packet.rolePolicy.allowedGuestRoles.includes(invite.role)) {
    holds.push(packet.rolePolicy.sensitiveRoles.includes(invite.role) ? "sensitive-role-requested" : "unknown-role");
  }
  if (!inviter) {
    holds.push("missing-inviter");
  } else {
    if (!inviter.active) holds.push("inactive-inviter");
    if (!inviter.roles.includes("owner") && !inviter.roles.includes("admin")) holds.push("inviter-lacks-authority");
  }
  if (duplicateEmailSet.has(String(invite.email).toLowerCase())) {
    holds.push("duplicate-outstanding-invite");
  }

  return {
    inviteId: invite.inviteId,
    email: invite.email,
    domain,
    role: invite.role,
    status: holds.length === 0 ? "ready-to-send" : "held-for-review",
    holds,
    remediation: holds.map(remediationForHold),
  };
}

function remediationForHold(hold) {
  const remediations = {
    "expired-invitation": "Cancel and issue a fresh invitation with a new expiry timestamp.",
    "domain-not-allowed": "Require owner approval or add the institution domain to the project allowlist.",
    "sensitive-role-requested": "Downgrade to a guest-safe role or route to role delegation approval.",
    "unknown-role": "Map the requested role to an approved project role.",
    "missing-inviter": "Require a current project owner to re-issue the invitation.",
    "inactive-inviter": "Require an active owner to re-issue the invitation.",
    "inviter-lacks-authority": "Require owner/admin approval before sending.",
    "duplicate-outstanding-invite": "Collapse duplicates and keep only the least-privileged active invitation.",
  };
  return remediations[hold] || "Review manually.";
}

function createInvitationReviewPacket(packet) {
  const duplicateEmailSet = duplicateEmails(packet.invitations);
  const evaluations = packet.invitations.map((invite) => evaluateInvitation(packet, invite, duplicateEmailSet));
  const ready = evaluations.filter((invite) => invite.status === "ready-to-send");
  const held = evaluations.filter((invite) => invite.status === "held-for-review");

  return {
    projectId: packet.projectId,
    evaluatedAt: packet.evaluatedAt,
    readyInvitations: ready.map((invite) => invite.inviteId),
    heldInvitations: held.map((invite) => invite.inviteId),
    evaluations,
    policyReceipt: {
      allowedDomains: packet.allowedDomains,
      allowedGuestRoles: packet.rolePolicy.allowedGuestRoles,
      sensitiveRolesRequireApproval: packet.rolePolicy.sensitiveRoles,
    },
  };
}

module.exports = {
  createInvitationReviewPacket,
  evaluateInvitation,
  domainOf,
  isExpired,
};
