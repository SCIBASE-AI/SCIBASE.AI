const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 34,
  high: 17,
  medium: 8,
  low: 3,
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

function finding(severity, code, title, evidence, action) {
  return { severity, code, title, evidence, action };
}

function hoursBetween(startIso, endIso) {
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 36e5));
}

function verifyRequester(project, request) {
  const findings = [];
  const requester = project.members.find((member) => member.id === request.requestedBy);

  if (!requester) {
    findings.push(finding(
      "blocker",
      "REQUESTER_NOT_PROJECT_MEMBER",
      "Deletion requester is not a project member",
      `${request.requestedBy} is not listed in project ${project.id}.`,
      "Reject the destructive action until it is initiated by a current project member.",
    ));
    return findings;
  }

  if (!["owner", "admin"].includes(requester.role)) {
    findings.push(finding(
      "blocker",
      "REQUESTER_LACKS_DESTRUCTIVE_ROLE",
      "Requester lacks permission for destructive project action",
      `${requester.id} role=${requester.role} attempted ${request.action}.`,
      "Require an owner/admin role and a fresh authorization event before deletion or archive.",
    ));
  }

  if (!requester.mfaConfirmedAt) {
    findings.push(finding(
      "high",
      "REQUESTER_MFA_MISSING",
      "Requester has not confirmed MFA for the destructive action",
      `${requester.id} has no mfaConfirmedAt value.`,
      "Require fresh MFA or passkey confirmation before continuing the escrow workflow.",
    ));
  }

  return findings;
}

function verifyEscrowWindow(project, request, policy) {
  const findings = [];
  const minimumHours = policy.minimumEscrowHours || 72;

  if (!request.escrowCreatedAt || !request.scheduledAt) {
    findings.push(finding(
      "blocker",
      "ESCROW_WINDOW_MISSING",
      "Deletion request lacks an escrow window",
      `${request.action} has escrowCreatedAt=${request.escrowCreatedAt || "missing"} scheduledAt=${request.scheduledAt || "missing"}.`,
      "Create a reversible escrow window before executing destructive project actions.",
    ));
    return findings;
  }

  const hours = hoursBetween(request.escrowCreatedAt, request.scheduledAt);
  if (hours < minimumHours) {
    findings.push(finding(
      "blocker",
      "ESCROW_WINDOW_TOO_SHORT",
      "Deletion escrow window is too short",
      `${project.id} escrow window is ${hours}h, below ${minimumHours}h.`,
      "Extend the scheduled deletion time or route to manual institutional review.",
    ));
  }

  if (!request.rollbackCheckpointId) {
    findings.push(finding(
      "high",
      "ROLLBACK_CHECKPOINT_MISSING",
      "No rollback checkpoint is attached",
      `${project.id} has no rollback checkpoint for ${request.action}.`,
      "Create a recovery snapshot before irreversible archive/delete execution.",
    ));
  }

  return findings;
}

function verifyExportAndCitation(project, request) {
  const findings = [];

  if (!request.exportBundleId) {
    findings.push(finding(
      "high",
      "PRE_DELETE_EXPORT_MISSING",
      "No pre-delete export bundle is attached",
      `${project.id} has no export bundle for ${request.action}.`,
      "Generate a manifest-backed export bundle before allowing destructive project changes.",
    ));
  }

  if (project.publication?.doi && !request.doiTombstonePlanned) {
    findings.push(finding(
      "blocker",
      "DOI_TOMBSTONE_MISSING",
      "Published DOI project lacks a tombstone plan",
      `${project.id} DOI=${project.publication.doi} without tombstone metadata.`,
      "Prepare DOI tombstone and citation-preservation metadata before deletion.",
    ));
  }

  if (project.publication?.indexed && !request.redirectUrl) {
    findings.push(finding(
      "high",
      "INDEXED_PROJECT_REDIRECT_MISSING",
      "Indexed project lacks a redirect URL",
      `${project.id} is indexed with no redirectUrl.`,
      "Add a persistent redirect for search engines, institutional repositories, and citations.",
    ));
  }

  return findings;
}

function verifyCollaboratorNotices(project, request, policy) {
  const findings = [];
  const requiredNoticeHours = policy.minimumNoticeHours || 48;
  const notified = new Set(request.notifiedMemberIds || []);
  const activeMembers = project.members.filter((member) => member.status === "active");
  const missingNotices = activeMembers.filter((member) => member.id !== request.requestedBy && !notified.has(member.id));

  if (missingNotices.length) {
    findings.push(finding(
      "high",
      "COLLABORATOR_NOTICE_MISSING",
      "Not all active collaborators were notified",
      `${missingNotices.map((member) => member.id).join(", ")} did not receive deletion notice.`,
      "Notify all active collaborators and give them a chance to export, fork, or dispute the action.",
    ));
  }

  if (request.noticeSentAt && request.scheduledAt) {
    const noticeHours = hoursBetween(request.noticeSentAt, request.scheduledAt);
    if (noticeHours < requiredNoticeHours) {
      findings.push(finding(
        "medium",
        "COLLABORATOR_NOTICE_TOO_SHORT",
        "Collaborator notice window is shorter than policy",
        `${project.id} notice window is ${noticeHours}h, below ${requiredNoticeHours}h.`,
        "Delay execution until the configured collaborator notice period has elapsed.",
      ));
    }
  }

  return findings;
}

function verifyHoldsAndDependencies(project, request) {
  const findings = [];

  if (project.legalHold) {
    findings.push(finding(
      "blocker",
      "LEGAL_HOLD_ACTIVE",
      "Project is under legal or compliance hold",
      `${project.id} legalHold=${project.legalHold.reason}.`,
      "Block deletion until legal/compliance owners release the hold.",
    ));
  }

  if (project.activeReviews?.length) {
    findings.push(finding(
      "high",
      "ACTIVE_REVIEW_DEPENDENCY",
      "Project has active review dependencies",
      `${project.id} has active reviews: ${project.activeReviews.join(", ")}.`,
      "Pause deletion until open peer review, grant, or institutional review dependencies are resolved.",
    ));
  }

  if (project.childForks?.some((fork) => fork.visibility === "private" && !fork.attributionMigrated)) {
    findings.push(finding(
      "medium",
      "PRIVATE_FORK_ATTRIBUTION_PENDING",
      "Private fork attribution has not been migrated",
      `${project.id} has private forks without migrated attribution.`,
      "Migrate attribution records so downstream forks keep provenance after deletion.",
    ));
  }

  if (request.action === "delete" && project.billing?.unsettledComputeCents > 0) {
    findings.push(finding(
      "high",
      "UNSETTLED_COMPUTE_CHARGES",
      "Project has unsettled compute charges",
      `${project.id} has $${(project.billing.unsettledComputeCents / 100).toFixed(2)} unsettled.`,
      "Settle or waive compute charges before project deletion.",
    ));
  }

  return findings;
}

function auditDeletionEscrow(project, request, policy = {}) {
  const findings = [
    ...verifyRequester(project, request),
    ...verifyEscrowWindow(project, request, policy),
    ...verifyExportAndCitation(project, request),
    ...verifyCollaboratorNotices(project, request, policy),
    ...verifyHoldsAndDependencies(project, request),
  ];

  const riskScore = Math.min(100, findings.reduce((sum, item) => sum + SEVERITY_WEIGHT[item.severity], 0));
  const blockers = findings.filter((item) => item.severity === "blocker").length;
  const high = findings.filter((item) => item.severity === "high").length;
  const decision = blockers
    ? "block-destructive-project-action"
    : high
      ? "manual-project-admin-review"
      : findings.length
        ? "schedule-with-escrow-caveats"
        : "ready-for-escrowed-execution";

  const packet = {
    projectId: project.id,
    action: request.action,
    requestedBy: request.requestedBy,
    reviewedAt: policy.reviewDate,
    decision,
    riskScore,
    scheduledAt: request.scheduledAt || null,
    activeMemberCount: project.members.filter((member) => member.status === "active").length,
    findings,
    remediationActions: findings.map((item) => ({ code: item.code, action: item.action })),
    generatedFrom: "synthetic-project-admin-data-only",
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Project Deletion Escrow Audit",
    "",
    `Project: ${result.projectId}`,
    `Action: ${result.action}`,
    `Decision: ${result.decision}`,
    `Risk score: ${result.riskScore}`,
    `Scheduled at: ${result.scheduledAt || "not scheduled"}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Findings",
  ];

  if (!result.findings.length) {
    lines.push("- No deletion escrow issues detected.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- [${item.severity}] ${item.title}: ${item.evidence}`);
      lines.push(`  Action: ${item.action}`);
    });
  }

  lines.push("", "## Safety", "- Synthetic project administration data only; no live projects, private files, identity providers, billing providers, credentials, or external APIs.");
  return `${lines.join("\n")}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgSummary(result) {
  const color = result.decision === "block-destructive-project-action"
    ? "#b42318"
    : result.decision === "ready-for-escrowed-execution"
      ? "#067647"
      : "#b54708";
  const severityCounts = ["blocker", "high", "medium", "low"].map((severity) => ({
    severity,
    count: result.findings.filter((item) => item.severity === severity).length,
  }));
  const maxCount = Math.max(...severityCounts.map((item) => item.count), 1);
  const bars = severityCounts.map((item, index) => {
    const y = 205 + index * 52;
    const width = Math.round(460 * item.count / maxCount);
    const fill = item.severity === "blocker" ? "#7a271a" : item.severity === "high" ? "#b42318" : item.severity === "medium" ? "#f79009" : "#667085";
    return `<text x="36" y="${y}" font-family="Arial" font-size="18" fill="#344054">${escapeXml(item.severity)}</text>
  <rect x="190" y="${y - 22}" width="460" height="28" rx="5" fill="#eaecf0"/>
  <rect x="190" y="${y - 22}" width="${width}" height="28" rx="5" fill="${fill}"/>
  <text x="676" y="${y}" font-family="Arial" font-size="18" fill="#344054">${item.count}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="450" viewBox="0 0 960 450" role="img" aria-label="Project deletion escrow audit summary">
  <rect width="960" height="450" fill="#f8fafc"/>
  <rect x="24" y="24" width="912" height="402" rx="12" fill="#ffffff" stroke="#d0d5dd"/>
  <text x="36" y="72" font-family="Arial" font-size="30" font-weight="700" fill="#101828">Project Deletion Escrow Audit</text>
  <rect x="36" y="98" width="430" height="48" rx="6" fill="${color}"/>
  <text x="56" y="129" font-family="Arial" font-size="21" font-weight="700" fill="#ffffff">${escapeXml(result.decision)}</text>
  <text x="496" y="129" font-family="Arial" font-size="22" fill="#101828">Risk score: ${result.riskScore}</text>
  <text x="36" y="166" font-family="Arial" font-size="18" fill="#667085">Audit digest: ${escapeXml(result.auditDigest)}</text>
  ${bars}
  <text x="36" y="416" font-family="Arial" font-size="18" fill="#667085">Synthetic project administration data only. No destructive actions are executed.</text>
</svg>
`;
}

module.exports = {
  auditDeletionEscrow,
  digest,
  hoursBetween,
  renderMarkdownReport,
  renderSvgSummary,
};
