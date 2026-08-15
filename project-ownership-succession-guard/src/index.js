"use strict";

const OWNER_INACTIVE_REASONS = new Set([
  "departed_institution",
  "owner_unreachable",
  "owner_inactive",
  "owner_deceased",
  "lab_closed",
  "account_suspended"
]);

const ELIGIBLE_ROLES = new Set([
  "admin",
  "principal_investigator",
  "data_steward",
  "institutional_steward",
  "co_owner"
]);

const COMPLIANCE_HOLDS = new Set([
  "irb_hold",
  "funder_embargo",
  "data_use_agreement",
  "human_subjects_restriction",
  "clinical_data_lock",
  "export_control"
]);

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function parseDate(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time) : null;
}

function daysBetween(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function normalizePacket(packet) {
  return {
    id: packet.id,
    title: packet.title || "Untitled ownership transfer packet",
    reviewDate: packet.reviewDate || "2026-08-15",
    project: packet.project || {},
    currentOwner: packet.currentOwner || {},
    proposedOwner: packet.proposedOwner || {},
    request: packet.request || {},
    approvals: packet.approvals || {},
    notices: packet.notices || {},
    attribution: packet.attribution || {},
    audit: packet.audit || {}
  };
}

function hasOwnerSuccessionTrigger(packet) {
  const reason = normalizeText(packet.request.reason);
  if (OWNER_INACTIVE_REASONS.has(reason)) return true;
  if (packet.currentOwner.active === false) return true;
  const lastSeenAge = daysBetween(packet.currentOwner.lastSeenAt, packet.reviewDate);
  return lastSeenAge !== null && lastSeenAge > Number(packet.request.inactivityThresholdDays || 90);
}

function proposedOwnerRoleEligible(proposedOwner) {
  const roles = list(proposedOwner.roles).map(normalizeText);
  return roles.some((role) => ELIGIBLE_ROLES.has(role));
}

function projectHasComplianceHold(project) {
  const holds = list(project.holds).map(normalizeText);
  return holds.some((hold) => COMPLIANCE_HOLDS.has(hold));
}

function independentApprovalPresent(packet) {
  const approvals = packet.approvals;
  if (approvals.institutionalSteward === true) return true;
  if (approvals.dataSteward === true && approvals.coOwnerQuorum === true) return true;
  if (approvals.courtOrEstateAuthority === true) return true;
  return false;
}

function collaboratorNoticeComplete(packet) {
  const collaborators = Number(packet.notices.collaboratorCount || 0);
  const notified = Number(packet.notices.notifiedCollaborators || 0);
  if (collaborators === 0) return true;
  return notified >= collaborators;
}

function noticeWindowAdequate(packet) {
  return Number(packet.notices.objectionWindowDays || 0) >= 14;
}

function attributionPreserved(packet) {
  return (
    packet.attribution.preserveOriginalOwnerCredit === true &&
    packet.attribution.preserveContributionHistory === true &&
    packet.attribution.transferReasonPublicReceipt === true
  );
}

function hasConflictingClaim(packet) {
  if (packet.request.competingOwnerClaim === true) return true;
  if (packet.audit.openOwnershipDispute === true) return true;
  return Number(packet.request.activeDisputeCount || 0) > 0;
}

function scoreFindings(findings) {
  const score = findings.reduce((total, item) => {
    if (item.severity === "critical") return total + 35;
    if (item.severity === "major") return total + 22;
    return total + 10;
  }, 0);
  return Math.min(100, score);
}

function decisionFor(findings) {
  if (findings.some((item) => item.severity === "critical")) return "HOLD";
  if (findings.some((item) => item.severity === "major")) return "REVIEW";
  return "APPROVE";
}

function analyzePacket(input) {
  const packet = normalizePacket(input);
  const findings = [];
  const hasTrigger = hasOwnerSuccessionTrigger(packet);
  const complianceHold = projectHasComplianceHold(packet.project);

  if (!hasTrigger) {
    findings.push(finding(
      "NO_VALID_SUCCESSION_TRIGGER",
      "critical",
      "The packet does not show a valid owner inactivity, departure, or succession trigger.",
      {
        reason: packet.request.reason || null,
        currentOwnerActive: packet.currentOwner.active,
        currentOwnerLastSeenAt: packet.currentOwner.lastSeenAt || null
      },
      "Require owner consent or document a valid inactivity, departure, death, suspension, or institutional succession trigger."
    ));
  }

  if (!proposedOwnerRoleEligible(packet.proposedOwner)) {
    findings.push(finding(
      "PROPOSED_OWNER_ROLE_INELIGIBLE",
      "critical",
      "The proposed owner lacks a succession-eligible project role.",
      { proposedOwner: packet.proposedOwner.id || null, roles: list(packet.proposedOwner.roles) },
      "Limit ownership succession to admins, co-owners, PIs, data stewards, or institutional stewards."
    ));
  }

  if (packet.proposedOwner.identityVerified !== true || packet.proposedOwner.mfaFresh !== true) {
    findings.push(finding(
      "SUCCESSOR_IDENTITY_POSTURE_INSUFFICIENT",
      "major",
      "The proposed owner does not have current verified identity and MFA evidence.",
      {
        identityVerified: packet.proposedOwner.identityVerified || false,
        mfaFresh: packet.proposedOwner.mfaFresh || false
      },
      "Require fresh identity verification and MFA before ownership transfer."
    ));
  }

  if (!independentApprovalPresent(packet)) {
    findings.push(finding(
      "INDEPENDENT_SUCCESSION_APPROVAL_MISSING",
      "critical",
      "Ownership transfer lacks an independent institutional, data-steward, quorum, or legal approval path.",
      packet.approvals,
      "Route the packet to an institutional steward, data steward plus co-owner quorum, or documented legal authority."
    ));
  }

  if (complianceHold && packet.approvals.complianceOfficer !== true) {
    findings.push(finding(
      "COMPLIANCE_HOLD_TRANSFER_APPROVAL_MISSING",
      "critical",
      "The project has regulated-data, IRB, DUA, embargo, clinical, or export-control holds without compliance approval.",
      { holds: list(packet.project.holds), complianceOfficer: packet.approvals.complianceOfficer || false },
      "Require compliance-officer approval and keep restricted objects frozen until the transfer is approved."
    ));
  }

  if (!collaboratorNoticeComplete(packet)) {
    findings.push(finding(
      "COLLABORATOR_SUCCESSION_NOTICE_INCOMPLETE",
      "major",
      "Not all collaborators were notified about the ownership succession request.",
      {
        collaboratorCount: Number(packet.notices.collaboratorCount || 0),
        notifiedCollaborators: Number(packet.notices.notifiedCollaborators || 0)
      },
      "Notify all active collaborators and preserve the notice receipt in the audit log."
    ));
  }

  if (!noticeWindowAdequate(packet)) {
    findings.push(finding(
      "OBJECTION_WINDOW_TOO_SHORT",
      "major",
      "The collaborator objection window is too short for a project ownership transfer.",
      { objectionWindowDays: Number(packet.notices.objectionWindowDays || 0) },
      "Provide at least a 14-day objection window unless legal or safety escalation documents an exception."
    ));
  }

  if (!attributionPreserved(packet)) {
    findings.push(finding(
      "ORIGINAL_OWNER_ATTRIBUTION_NOT_PRESERVED",
      "major",
      "The transfer packet does not preserve original owner credit, contribution history, and a public transfer receipt.",
      packet.attribution,
      "Preserve original PI/owner credit, contribution records, and a public audit receipt for the transfer reason."
    ));
  }

  if (hasConflictingClaim(packet)) {
    findings.push(finding(
      "COMPETING_OWNERSHIP_CLAIM_UNRESOLVED",
      "critical",
      "The transfer has an unresolved ownership dispute or competing successor claim.",
      {
        competingOwnerClaim: packet.request.competingOwnerClaim || false,
        activeDisputeCount: Number(packet.request.activeDisputeCount || 0),
        openOwnershipDispute: packet.audit.openOwnershipDispute || false
      },
      "Hold the transfer until the dispute is resolved by independent governance."
    ));
  }

  if (packet.audit.immutableReceipt !== true) {
    findings.push(finding(
      "IMMUTABLE_TRANSFER_AUDIT_RECEIPT_MISSING",
      "major",
      "The succession packet lacks an immutable audit receipt.",
      { immutableReceipt: packet.audit.immutableReceipt || false },
      "Record the trigger, approvals, notices, object freezes, and attribution preservation in an immutable audit receipt."
    ));
  }

  const decision = decisionFor(findings);
  return {
    id: packet.id,
    title: packet.title,
    decision,
    riskScore: scoreFindings(findings),
    hasSuccessionTrigger: hasTrigger,
    complianceHold,
    findings,
    recommendedActions: buildRecommendedActions(decision, findings)
  };
}

function buildRecommendedActions(decision, findings) {
  if (decision === "APPROVE") {
    return ["Approve the ownership transfer and retain the succession receipt."];
  }

  const actions = [
    "Freeze owner-only project actions until the succession packet is resolved.",
    "Route the packet to independent governance review.",
    "Preserve original owner attribution and collaborator notice evidence."
  ];

  if (findings.some((item) => item.code === "COMPLIANCE_HOLD_TRANSFER_APPROVAL_MISSING")) {
    actions.unshift("Keep regulated datasets and embargoed artifacts locked until compliance approval is recorded.");
  }

  return actions;
}

function analyzeSuccessionPackets(packets) {
  const results = list(packets).map(analyzePacket);
  const counts = results.reduce((acc, item) => {
    acc[item.decision] = (acc[item.decision] || 0) + 1;
    return acc;
  }, { APPROVE: 0, REVIEW: 0, HOLD: 0 });

  return {
    generatedAt: new Date().toISOString(),
    totalPackets: results.length,
    counts,
    results
  };
}

module.exports = {
  analyzePacket,
  analyzeSuccessionPackets,
  daysBetween,
  hasOwnerSuccessionTrigger
};
