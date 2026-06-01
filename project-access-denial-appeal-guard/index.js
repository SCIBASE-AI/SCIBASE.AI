"use strict";

const crypto = require("node:crypto");

const SEVERITY_ORDER = ["critical", "high", "warning", "info"];

const DEFAULT_POLICY = {
  appealWindowDays: 14,
  minRationaleCharacters: 24,
  independentReviewerRoles: ["data-steward", "institution-admin", "ethics-reviewer"],
  requiredEvidenceByClassification: {
    restricted_human: ["trainingValid", "duaActive", "irbApproval"],
    confidential: ["trainingValid", "duaActive"],
    institutional_only: ["trainingValid"]
  }
};

function evaluateAccessDenialAppeals(packet, options = {}) {
  if (!isPlainObject(packet)) {
    throw new TypeError("evaluateAccessDenialAppeals expects a packet object");
  }

  const now = options.now ?? new Date().toISOString();
  const policy = {
    ...DEFAULT_POLICY,
    ...(isPlainObject(packet.policy) ? packet.policy : {}),
    requiredEvidenceByClassification: {
      ...DEFAULT_POLICY.requiredEvidenceByClassification,
      ...(isPlainObject(packet.policy?.requiredEvidenceByClassification)
        ? packet.policy.requiredEvidenceByClassification
        : {})
    }
  };
  const accessRequests = asArray(packet.accessRequests);
  const findings = [];
  const appealDecisions = [];

  if (accessRequests.length === 0) {
    findings.push(
      finding(
        "NO_ACCESS_REQUESTS",
        "high",
        "No denied project access requests were supplied.",
        "The guard needs denial and appeal packets before a user-facing decision is finalized.",
        "accessRequests",
        "Attach denied access requests with denial reasons, appeal packets, evidence, and audit receipts.",
        "workspace admin"
      )
    );
  }

  accessRequests.forEach((request, index) => {
    inspectAccessRequest(request, index, policy, findings, appealDecisions);
  });

  const sortedFindings = sortFindings(findings);
  const status = determineStatus(sortedFindings);
  const remediationActions = sortedFindings.map((item) => ({
    code: item.code,
    requestId: item.requestId,
    owner: item.owner,
    action: item.remediation
  }));
  const summary = summarize(status, sortedFindings, appealDecisions);
  const fingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        policy,
        accessRequests: accessRequests.map((request) => ({
          id: request.id,
          classification: request.project?.classification,
          denialCode: request.denial?.reasonCode,
          appealDecision: request.appeal?.decision,
          findingCodes: sortedFindings.map((item) => item.code)
        }))
      })
    )
    .digest("hex")
    .slice(0, 16);

  return {
    generatedAt: now,
    status,
    summary,
    findingCounts: countBySeverity(sortedFindings),
    findings: sortedFindings,
    appealDecisions,
    remediationActions,
    fingerprint
  };
}

function renderMarkdownReport(result, packet) {
  const lines = [
    "# Project Access Denial and Appeal Guard",
    "",
    `Packet: ${packet.id ?? "unknown"}`,
    `Status: ${result.status}`,
    `Fingerprint: ${result.fingerprint}`,
    "",
    "## Summary",
    "",
    result.summary,
    "",
    "## Appeal Decisions",
    ""
  ];

  if (result.appealDecisions.length === 0) {
    lines.push("- No appeal decisions were evaluated.");
  } else {
    result.appealDecisions.forEach((decision) => {
      lines.push(`- ${decision.requestId}: ${decision.finalAction}; ${decision.findingCodes.length} finding(s)`);
      lines.push(`  - Requester: ${decision.requesterId}; project ${decision.projectId}`);
      lines.push(`  - Appeal state: ${decision.appealState}; receipt ${decision.receiptState}`);
    });
  }

  lines.push("", "## Findings", "");
  if (result.findings.length === 0) {
    lines.push("- No denial/appeal governance blockers found.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- ${item.severity.toUpperCase()} ${item.code}: ${item.message}`);
      lines.push(`  - Evidence: ${item.evidence}`);
      lines.push(`  - Remediation: ${item.remediation}`);
    });
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(result) {
  const counts = result.findingCounts;
  const blockers = (counts.critical ?? 0) + (counts.high ?? 0);
  const warnings = counts.warning ?? 0;
  const ready = result.status === "READY";
  const statusColor = ready ? "#16794c" : result.status === "REVIEW" ? "#a15c00" : "#a11b32";
  const safeWidth = ready ? 360 : Math.max(90, 360 - blockers * 45);
  const blockerWidth = Math.min(330, blockers * 54);
  const warningWidth = Math.min(220, warnings * 42);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Project access denial appeal guard summary">`,
    `<rect width="960" height="540" fill="#111827"/>`,
    `<rect x="48" y="48" width="864" height="444" rx="12" fill="#f8fafc"/>`,
    `<text x="82" y="118" font-family="Arial, sans-serif" font-size="33" font-weight="700" fill="#111827">Access denial appeal guard</text>`,
    `<text x="82" y="162" font-family="Arial, sans-serif" font-size="19" fill="#475569">Status ${escapeXml(result.status)} - fingerprint ${escapeXml(result.fingerprint)}</text>`,
    `<rect x="82" y="214" width="${safeWidth}" height="62" fill="#16794c"/>`,
    `<rect x="${82 + safeWidth}" y="214" width="${warningWidth}" height="62" fill="#a15c00"/>`,
    `<rect x="${82 + safeWidth + warningWidth}" y="214" width="${blockerWidth}" height="62" fill="${statusColor}"/>`,
    `<text x="96" y="254" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">APPEAL REVIEW</text>`,
    `<text x="82" y="340" font-family="Arial, sans-serif" font-size="22" fill="#334155">Critical/high blockers: ${blockers}</text>`,
    `<text x="82" y="380" font-family="Arial, sans-serif" font-size="22" fill="#334155">Appeals checked: ${result.appealDecisions.length}</text>`,
    `<text x="82" y="420" font-family="Arial, sans-serif" font-size="22" fill="#334155">Warning evidence gaps: ${warnings}</text>`,
    `</svg>`
  ].join("\n");
}

function inspectAccessRequest(request, index, policy, findings, appealDecisions) {
  const requestId = request.id ?? `access-request-${index}`;
  const path = `accessRequests[${index}]`;
  const project = isPlainObject(request.project) ? request.project : {};
  const requester = isPlainObject(request.requester) ? request.requester : {};
  const denial = isPlainObject(request.denial) ? request.denial : {};
  const appeal = isPlainObject(request.appeal) ? request.appeal : {};
  const objects = asArray(request.requestedObjects);
  const auditReceipt = isPlainObject(request.auditReceipt) ? request.auditReceipt : {};

  const beforeCount = findings.length;

  if (!request.id) {
    findings.push(
      finding(
        "REQUEST_ID_MISSING",
        "high",
        `Access request at index ${index} has no stable id.`,
        "Appeal packets must remain traceable across user notices and audit logs.",
        `${path}.id`,
        "Assign a stable access request id before finalizing the decision.",
        "workspace admin",
        requestId
      )
    );
  }

  if (!requester.id) {
    findings.push(
      finding(
        "REQUESTER_ID_MISSING",
        "high",
        `${requestId} has no requester id.`,
        "The user-facing decision cannot be traced to a researcher profile or account.",
        `${path}.requester.id`,
        "Attach the requester account or researcher profile id.",
        "identity admin",
        requestId
      )
    );
  }

  inspectDenial(requestId, path, denial, findings);
  inspectAppeal(requestId, path, denial, appeal, project, policy, findings);
  inspectEvidence(requestId, path, project, appeal, policy, findings);
  inspectObjectScope(requestId, path, objects, project, findings);
  inspectAuditReceipt(requestId, path, auditReceipt, denial, appeal, findings);

  const requestFindings = findings.slice(beforeCount);
  appealDecisions.push({
    requestId,
    requesterId: requester.id ?? null,
    projectId: project.id ?? null,
    classification: project.classification ?? "unknown",
    appealState: appeal.submittedAt ? "submitted" : "missing",
    finalAction: requestFindings.some((item) => item.severity === "critical" || item.severity === "high")
      ? "hold-decision"
      : appeal.decision ?? denial.outcome ?? "finalize-denial",
    receiptState: auditReceipt.userFacingNotice ? "ready" : "missing",
    findingCodes: requestFindings.map((item) => item.code)
  });
}

function inspectDenial(requestId, path, denial, findings) {
  if (!denial.reasonCode) {
    findings.push(
      finding(
        "DENIAL_REASON_CODE_MISSING",
        "high",
        `${requestId} has no denial reason code.`,
        "Researchers need a concrete denial basis before they can appeal or remediate access gaps.",
        `${path}.denial.reasonCode`,
        "Add a stable denial reason code such as TRAINING_EXPIRED, DUA_MISSING, IRB_SCOPE_MISMATCH, or OBJECT_SCOPE_TOO_BROAD.",
        "workspace admin",
        requestId
      )
    );
  }

  if (!denial.rationale || String(denial.rationale).trim().length < DEFAULT_POLICY.minRationaleCharacters) {
    findings.push(
      finding(
        "DENIAL_RATIONALE_TOO_THIN",
        "high",
        `${requestId} has an insufficient denial rationale.`,
        "The user-facing decision needs enough context to be fair, appealable, and auditable.",
        `${path}.denial.rationale`,
        "Document the missing requirement, affected object scope, and remediation path.",
        "workspace admin",
        requestId
      )
    );
  }

  if (denial.privateNotes && denial.redactedForRequester !== true) {
    findings.push(
      finding(
        "PRIVATE_DENIAL_NOTE_EXPOSED",
        "critical",
        `${requestId} has private denial notes without requester-safe redaction.`,
        "Denied-access notices must not leak hidden reviewer comments, protected collaborator details, or institutional security notes.",
        `${path}.denial.redactedForRequester`,
        "Redact private notes and expose only a requester-safe reason code plus remediation checklist.",
        "privacy reviewer",
        requestId
      )
    );
  }
}

function inspectAppeal(requestId, path, denial, appeal, project, policy, findings) {
  if (!appeal.submittedAt) {
    findings.push(
      finding(
        "APPEAL_PACKET_MISSING",
        "warning",
        `${requestId} has no appeal packet.`,
        "The system can finalize a denial, but the audit packet should still record whether an appeal was offered.",
        `${path}.appeal`,
        "Record appeal deadline, appeal status, and evidence checklist even if the researcher does not appeal.",
        "workspace admin",
        requestId
      )
    );
    return;
  }

  if (denial.deniedAt && daysBetween(denial.deniedAt, appeal.submittedAt) > policy.appealWindowDays) {
    findings.push(
      finding(
        "APPEAL_WINDOW_EXPIRED",
        "high",
        `${requestId} appeal was submitted after the ${policy.appealWindowDays}-day appeal window.`,
        "Late appeals need explicit exception approval before a denial decision is changed.",
        `${path}.appeal.submittedAt`,
        "Route to institution-admin exception review or keep the denial final with a clear late-appeal receipt.",
        "institution admin",
        requestId
      )
    );
  }

  if (!appeal.reviewerId) {
    findings.push(
      finding(
        "APPEAL_REVIEWER_MISSING",
        "high",
        `${requestId} appeal has no reviewer id.`,
        "Final appeal outcomes must identify the accountable reviewer.",
        `${path}.appeal.reviewerId`,
        "Assign an independent reviewer before finalizing the appeal.",
        "workspace admin",
        requestId
      )
    );
  } else if (appeal.reviewerId === denial.deniedBy) {
    findings.push(
      finding(
        "APPEAL_REVIEWER_NOT_INDEPENDENT",
        "high",
        `${requestId} appeal is reviewed by the same actor who denied access.`,
        "Appeals require independence from the original denial decision.",
        `${path}.appeal.reviewerId`,
        "Assign an independent data steward, institution admin, or ethics reviewer.",
        "workspace admin",
        requestId
      )
    );
  }

  if (!policy.independentReviewerRoles.includes(appeal.reviewerRole)) {
    findings.push(
      finding(
        "APPEAL_REVIEWER_ROLE_NOT_ELIGIBLE",
        "high",
        `${requestId} appeal reviewer role ${appeal.reviewerRole ?? "unknown"} is not eligible.`,
        `Eligible appeal reviewer roles: ${policy.independentReviewerRoles.join(", ")}.`,
        `${path}.appeal.reviewerRole`,
        "Assign a reviewer with an eligible governance role or document a policy exception.",
        "workspace admin",
        requestId
      )
    );
  }

  if (appeal.privateNotes && appeal.redactedForRequester !== true) {
    findings.push(
      finding(
        "PRIVATE_APPEAL_NOTE_EXPOSED",
        "critical",
        `${requestId} appeal includes private notes without requester-safe redaction.`,
        "Appeal responses must not reveal private collaborator notes or hidden institutional risk comments.",
        `${path}.appeal.redactedForRequester`,
        "Redact private notes and publish only requester-safe appeal rationale.",
        "privacy reviewer",
        requestId
      )
    );
  }

  if (appeal.decision === "approve" && project.classification === "restricted_human") {
    const evidence = isPlainObject(appeal.evidence) ? appeal.evidence : {};
    const missing = (policy.requiredEvidenceByClassification.restricted_human ?? []).filter((key) => evidence[key] !== true);
    if (missing.length > 0) {
      findings.push(
        finding(
          "APPROVAL_WITH_MISSING_RESTRICTED_EVIDENCE",
          "critical",
          `${requestId} approves restricted human-data access while evidence is missing: ${missing.join(", ")}.`,
          "Restricted access appeals cannot override training, DUA, or IRB prerequisites.",
          `${path}.appeal.evidence`,
          "Hold approval until all restricted-data prerequisites are present and current.",
          "data steward",
          requestId
        )
      );
    }
  }
}

function inspectEvidence(requestId, path, project, appeal, policy, findings) {
  const classification = project.classification ?? "institutional_only";
  const required = policy.requiredEvidenceByClassification[classification] ?? [];
  const evidence = isPlainObject(appeal.evidence) ? appeal.evidence : {};

  required.forEach((key) => {
    if (evidence[key] !== true) {
      findings.push(
        finding(
          "REQUIRED_APPEAL_EVIDENCE_MISSING",
          "high",
          `${requestId} is missing required evidence ${key} for ${classification} access.`,
          "Appeal outcomes must prove the requester satisfied the project data-access prerequisites.",
          `${path}.appeal.evidence.${key}`,
          `Attach valid ${key} evidence or keep access denied with a remediation checklist.`,
          "data steward",
          requestId
        )
      );
    }
  });
}

function inspectObjectScope(requestId, path, objects, project, findings) {
  if (objects.length === 0) {
    findings.push(
      finding(
        "REQUESTED_OBJECT_SCOPE_MISSING",
        "high",
        `${requestId} has no object-level access scope.`,
        "Project access decisions should state exactly which datasets, notebooks, documents, or comments were denied or appealed.",
        `${path}.requestedObjects`,
        "Attach object-level paths, ids, classifications, and requested permission levels.",
        "workspace admin",
        requestId
      )
    );
    return;
  }

  const broadObjects = objects.filter((object) => object.scope === "all-project" || object.path === "*");
  if (broadObjects.length > 0 && project.classification !== "public") {
    findings.push(
      finding(
        "BROAD_RESTRICTED_SCOPE_REQUEST",
        "high",
        `${requestId} requests broad access to a non-public project.`,
        "Restricted projects should appeal access at the narrowest object and permission scope that supports the research need.",
        `${path}.requestedObjects`,
        "Replace all-project scope with specific datasets, notebooks, manuscripts, or review threads and least-privilege permissions.",
        "workspace admin",
        requestId
      )
    );
  }
}

function inspectAuditReceipt(requestId, path, auditReceipt, denial, appeal, findings) {
  if (auditReceipt.userFacingNotice !== true) {
    findings.push(
      finding(
        "USER_FACING_RECEIPT_MISSING",
        "high",
        `${requestId} has no requester-facing denial/appeal receipt.`,
        "Researchers need a stable notice showing the decision, appeal path, and remediation checklist.",
        `${path}.auditReceipt.userFacingNotice`,
        "Generate a requester-safe audit receipt with reason code, appeal deadline, outcome, and evidence checklist.",
        "workspace admin",
        requestId
      )
    );
  }

  const requiredFields = ["reasonCode", "appealDeadline", "evidenceChecklist", "decisionTimestamp"];
  const missingFields = requiredFields.filter((field) => !asArray(auditReceipt.fields).includes(field));
  if (missingFields.length > 0) {
    findings.push(
      finding(
        "AUDIT_RECEIPT_FIELDS_MISSING",
        "warning",
        `${requestId} audit receipt is missing fields: ${missingFields.join(", ")}.`,
        "Complete receipts reduce support churn and make the appeal process auditable.",
        `${path}.auditReceipt.fields`,
        "Add the missing receipt fields before finalizing the denial or appeal decision.",
        "workspace admin",
        requestId
      )
    );
  }

  if (denial.reasonCode && !asArray(auditReceipt.fields).includes("reasonCode")) {
    findings.push(
      finding(
        "DENIAL_REASON_NOT_IN_RECEIPT",
        "warning",
        `${requestId} denial reason is not included in the user receipt.`,
        "The requester needs the reason code to understand and remediate the denial.",
        `${path}.auditReceipt.fields`,
        "Include reasonCode in the user-facing receipt.",
        "workspace admin",
        requestId
      )
    );
  }

  if (appeal.submittedAt && !asArray(auditReceipt.fields).includes("appealOutcome")) {
    findings.push(
      finding(
        "APPEAL_OUTCOME_NOT_IN_RECEIPT",
        "warning",
        `${requestId} appeal outcome is not included in the user receipt.`,
        "The requester-facing receipt should close the loop after an appeal is reviewed.",
        `${path}.auditReceipt.fields`,
        "Include appealOutcome and reviewerRole in the final appeal receipt.",
        "workspace admin",
        requestId
      )
    );
  }
}

function summarize(status, findings, appealDecisions) {
  const blockers = findings.filter((item) => item.severity === "critical" || item.severity === "high").length;
  if (status === "READY") {
    return `All ${appealDecisions.length} denied-access appeal packet(s) are ready for requester-safe finalization.`;
  }
  if (status === "HOLD") {
    return `Hold final access decisions: ${blockers} critical or high denial/appeal governance blocker(s) need remediation.`;
  }
  return `Review needed: ${findings.length} warning-level denial/appeal evidence gap(s) should be completed.`;
}

function finding(code, severity, message, evidence, path, remediation, owner, requestId = null) {
  return {
    code,
    severity,
    message,
    evidence,
    path,
    remediation,
    owner,
    requestId
  };
}

function sortFindings(findings) {
  return [...findings].sort((a, b) => {
    const severityDelta = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (severityDelta !== 0) {
      return severityDelta;
    }
    return a.code.localeCompare(b.code);
  });
}

function determineStatus(findings) {
  if (findings.some((item) => item.severity === "critical" || item.severity === "high")) {
    return "HOLD";
  }
  if (findings.some((item) => item.severity === "warning")) {
    return "REVIEW";
  }
  return "READY";
}

function countBySeverity(findings) {
  return findings.reduce((counts, item) => {
    counts[item.severity] = (counts[item.severity] ?? 0) + 1;
    return counts;
  }, {});
}

function daysBetween(start, end) {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return 0;
  }
  return (endMs - startMs) / 86400000;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

module.exports = {
  DEFAULT_POLICY,
  evaluateAccessDenialAppeals,
  renderMarkdownReport,
  renderSvgSummary
};
