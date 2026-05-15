"use strict";

const crypto = require("node:crypto");

const REDACTED = "[redacted]";

function stableStringify(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return "{" + Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + stableStringify(value[key]))
      .join(",") + "}";
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function validateEscrowInput(input) {
  const issues = [];
  if (!input || typeof input !== "object") issues.push("input");
  if (!input.programId) issues.push("programId");
  if (!input.policy) issues.push("policy");
  if (!Array.isArray(input.participants)) issues.push("participants");
  if (!Array.isArray(input.projects)) issues.push("projects");
  if (!Array.isArray(input.accessRequests)) issues.push("accessRequests");
  if (!Array.isArray(input.deanonymizationRequests)) issues.push("deanonymizationRequests");

  for (const participant of input.participants || []) {
    if (!participant.id) issues.push("participant.id");
    if (!participant.role) issues.push((participant.id || "unknown") + ".role");
    if (!Array.isArray(participant.linkedIdentities)) {
      issues.push((participant.id || "unknown") + ".linkedIdentities");
    }
  }

  for (const request of input.accessRequests || []) {
    if (!request.participantId) issues.push((request.id || "unknown") + ".participantId");
    if (!request.projectId) issues.push((request.id || "unknown") + ".projectId");
    if (!request.requestedScope) issues.push((request.id || "unknown") + ".requestedScope");
  }

  if (issues.length) {
    throw new Error("Invalid escrow input: " + issues.join(", "));
  }
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function pseudonymFor(programId, participantId) {
  return "anon-" + sha256({ programId, participantId }).slice(0, 10);
}

function scoreIdentityAssurance(participant) {
  const verifiedLinks = participant.linkedIdentities.filter((identity) => identity.verified);
  const providers = new Set(verifiedLinks.map((identity) => identity.provider));
  let score = 0;
  score += Math.min(45, verifiedLinks.length * 15);
  score += providers.has("orcid") ? 15 : 0;
  score += providers.has("saml") ? 15 : 0;
  score += participant.mfaEnabled ? 15 : 0;
  score += participant.institutionVerified ? 10 : 0;
  score -= (participant.flags || []).length * 8;
  return Math.max(0, Math.min(100, score));
}

function summarizeIdentityEvidence(participant) {
  return {
    verifiedProviders: participant.linkedIdentities
      .filter((identity) => identity.verified)
      .map((identity) => identity.provider)
      .sort(),
    redactedSubjects: participant.linkedIdentities.map((identity) => ({
      provider: identity.provider,
      verified: identity.verified,
      subject: REDACTED
    })),
    mfaEnabled: participant.mfaEnabled,
    institutionVerified: participant.institutionVerified,
    training: participant.training || {},
    flags: participant.flags || []
  };
}

function escrowParticipants(input) {
  return input.participants.map((participant) => {
    const anonymous = participant.profileMode === "anonymous-review";
    const assuranceScore = scoreIdentityAssurance(participant);
    return {
      participantId: participant.id,
      role: participant.role,
      publicHandle: anonymous ? pseudonymFor(input.programId, participant.id) : participant.displayName,
      profileMode: participant.profileMode,
      identityVisibleToReviewSubject: !anonymous,
      assuranceScore,
      identityEvidence: summarizeIdentityEvidence(participant),
      status: assuranceScore >= input.policy.requiredAssurance ? "escrow-ready" : "needs-identity-hardening"
    };
  });
}

function evaluateAccessRequest(request, context) {
  const participant = context.participants.get(request.participantId);
  const project = context.projects.get(request.projectId);
  const escrow = context.escrowByParticipant.get(request.participantId);
  const reasons = [];

  if (!participant) reasons.push("unknown-participant");
  if (!project) reasons.push("unknown-project");
  if (!escrow) reasons.push("missing-escrow-record");
  if (participant && participant.role !== "admin" && participant.role !== "reviewer") {
    reasons.push("role-not-eligible");
  }
  if (escrow && escrow.assuranceScore < context.policy.requiredAssurance) {
    reasons.push("identity-assurance-below-threshold");
  }
  if (
    participant &&
    participant.profileMode === "anonymous-review" &&
    context.policy.restrictedScopesForAnonymousReviewers.includes(request.requestedScope)
  ) {
    reasons.push("anonymous-reviewer-restricted-scope");
  }
  if (participant && participant.training && participant.training.dataUse === "expired") {
    reasons.push("data-use-training-expired");
  }

  return {
    id: request.id,
    participantId: request.participantId,
    publicHandle: escrow ? escrow.publicHandle : "unknown",
    projectId: request.projectId,
    objectId: request.objectId,
    requestedScope: request.requestedScope,
    decision: reasons.length === 0 ? "allow" : "deny",
    reasons: reasons.length ? reasons : ["least-privilege-review-access"],
    auditEventHash: sha256({
      request,
      reasons,
      publicHandle: escrow ? escrow.publicHandle : "unknown"
    })
  };
}

function evaluateDeanonymizationRequest(request, context) {
  const requester = context.participants.get(request.requesterId);
  const target = context.participants.get(request.targetParticipantId);
  const targetEscrow = context.escrowByParticipant.get(request.targetParticipantId);
  const reasons = [];

  if (!requester || requester.role !== "admin") reasons.push("requester-not-admin");
  if (!target) reasons.push("unknown-target");
  if (!context.policy.allowedDeanonymizationReasons.includes(request.reason)) {
    reasons.push("reason-not-policy-approved");
  }
  if ((request.approvals || []).length < context.policy.deanonymizationQuorum) {
    reasons.push("quorum-not-met");
  }
  if (!request.dueProcessNotice) reasons.push("due-process-notice-missing");
  if (!request.evidenceFlags || request.evidenceFlags.length === 0) {
    reasons.push("no-evidence-flags");
  }

  return {
    id: request.id,
    targetPublicHandle: targetEscrow ? targetEscrow.publicHandle : "unknown",
    reason: request.reason,
    decision: reasons.length === 0 ? "release-to-authorized-admins" : "keep-sealed",
    reasons: reasons.length ? reasons : ["policy-reason-approved", "quorum-met", "due-process-recorded"],
    sealedIdentityHash: target ? sha256({ targetParticipantId: target.id, identities: target.linkedIdentities }) : null,
    auditEventHash: sha256(request)
  };
}

function buildActionItems(accessDecisions, deanonymizationDecisions, escrowRecords) {
  const actions = [];
  for (const record of escrowRecords) {
    if (record.status !== "escrow-ready") {
      actions.push({
        owner: record.publicHandle,
        type: "identity-hardening",
        message: "Require MFA, institution verification, or current training before anonymous review access."
      });
    }
  }
  for (const decision of accessDecisions) {
    if (decision.decision === "deny") {
      actions.push({
        owner: decision.publicHandle,
        type: "access-remediation",
        message: "Denied " + decision.requestedScope + ": " + decision.reasons.join(", ") + "."
      });
    }
  }
  for (const decision of deanonymizationDecisions) {
    if (decision.decision === "release-to-authorized-admins") {
      actions.push({
        owner: decision.targetPublicHandle,
        type: "privacy-breakglass",
        message: "Deanonymization approved only for authorized admins with audit trail."
      });
    }
  }
  return actions;
}

function createIdentityEscrowPacket(input) {
  validateEscrowInput(input);

  const escrowRecords = escrowParticipants(input);
  const context = {
    policy: input.policy,
    participants: indexById(input.participants),
    projects: indexById(input.projects),
    escrowByParticipant: indexById(escrowRecords.map((record) => ({
      ...record,
      id: record.participantId
    })))
  };
  const accessDecisions = input.accessRequests.map((request) => evaluateAccessRequest(request, context));
  const deanonymizationDecisions = input.deanonymizationRequests.map((request) =>
    evaluateDeanonymizationRequest(request, context)
  );
  const actions = buildActionItems(accessDecisions, deanonymizationDecisions, escrowRecords);
  const packet = {
    programId: input.programId,
    generatedAt: "2026-05-15T10:20:00.000Z",
    policy: input.policy,
    escrowRecords,
    accessDecisions,
    deanonymizationDecisions,
    actions,
    summary: {
      participants: escrowRecords.length,
      escrowReady: escrowRecords.filter((record) => record.status === "escrow-ready").length,
      allowedAccess: accessDecisions.filter((decision) => decision.decision === "allow").length,
      deniedAccess: accessDecisions.filter((decision) => decision.decision === "deny").length,
      deanonymizationApproved: deanonymizationDecisions.filter((decision) =>
        decision.decision === "release-to-authorized-admins"
      ).length
    }
  };
  return {
    ...packet,
    auditDigest: sha256(packet)
  };
}

module.exports = {
  REDACTED,
  createIdentityEscrowPacket,
  evaluateAccessRequest,
  evaluateDeanonymizationRequest,
  pseudonymFor,
  scoreIdentityAssurance,
  stableStringify,
  validateEscrowInput
};
