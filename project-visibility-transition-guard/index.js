const SEVERITY_WEIGHTS = {
  critical: 36,
  high: 22,
  medium: 10,
  low: 4
};

function addFinding(findings, severity, rule, message, action, refs = []) {
  findings.push({ severity, rule, message, action, refs });
}

function isValidDate(value) {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(new Date(value).getTime());
}

function duplicateIds(items) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (seen.has(item.id)) {
      duplicates.add(item.id);
    }
    seen.add(item.id);
  }
  return [...duplicates];
}

function collaboratorById(project) {
  return new Map(project.collaborators.map((collaborator) => [collaborator.id, collaborator]));
}

function objectById(project) {
  return new Map(project.objects.map((object) => [object.id, object]));
}

function activeHolds(project) {
  return project.holds.filter((hold) => hold.status === "active");
}

function validateEvidenceIntegrity(project, findings) {
  const identityCollections = [
    ["collaborator", project.collaborators],
    ["object", project.objects],
    ["hold", project.holds],
    ["external-access", project.externalAccess],
    ["audit-event", project.auditEvents]
  ];

  for (const [kind, items] of identityCollections) {
    for (const duplicateId of duplicateIds(items)) {
      addFinding(
        findings,
        "critical",
        `${kind}-id-duplicate`,
        `${kind} identifier ${duplicateId} appears more than once.`,
        "Resolve identity ambiguity before evaluating or applying public visibility.",
        [duplicateId]
      );
    }
  }

  const collaboratorIds = new Set(project.collaborators.map((collaborator) => collaborator.id));
  if (!collaboratorIds.has(project.workspace.requestedBy)) {
    addFinding(
      findings,
      "critical",
      "visibility-requester-unknown",
      `Visibility requester ${project.workspace.requestedBy} is not a workspace collaborator.`,
      "Identify and authorize the requester before evaluating the transition.",
      [project.workspace.id, project.workspace.requestedBy]
    );
  }

  if (!isValidDate(project.workspace.requestedAt)) {
    addFinding(
      findings,
      "critical",
      "visibility-request-date-invalid",
      "The visibility request has no valid timestamp.",
      "Repair the request evidence before evaluating the transition.",
      [project.workspace.id, String(project.workspace.requestedAt)]
    );
  }

  const requiredAuditActions = project.policy.requiredAuditActions || [
    "visibility-requested",
    "object-reviewed",
    "institution-approved",
    "public-release-approved"
  ];
  const observedAuditActions = new Set();
  for (const event of project.auditEvents) {
    observedAuditActions.add(event.action);
    if (!collaboratorIds.has(event.actorId)) {
      addFinding(
        findings,
        "critical",
        "audit-actor-unknown",
        `Audit event ${event.id} references unknown actor ${event.actorId}.`,
        "Resolve the event actor before accepting the transition audit trail.",
        [event.id, event.actorId]
      );
    }
    if (!isValidDate(event.at)) {
      addFinding(
        findings,
        "critical",
        "audit-event-date-invalid",
        `Audit event ${event.id} has no valid timestamp.`,
        "Repair or quarantine the event before accepting the transition audit trail.",
        [event.id, String(event.at)]
      );
    } else if (
      isValidDate(project.workspace.requestedAt) &&
      event.action !== "visibility-requested" &&
      new Date(event.at).getTime() < new Date(project.workspace.requestedAt).getTime()
    ) {
      addFinding(
        findings,
        "critical",
        "audit-event-precedes-request",
        `Audit event ${event.id} predates the visibility request.`,
        "Rebuild the chronological audit trail before applying visibility.",
        [event.id, event.at, project.workspace.requestedAt]
      );
    }
  }

  for (const action of requiredAuditActions) {
    if (!observedAuditActions.has(action)) {
      addFinding(
        findings,
        "critical",
        "required-audit-action-missing",
        `Required audit action ${action} is missing.`,
        "Record the complete request, review, approval, and release decision trail before applying visibility.",
        [project.workspace.id, action]
      );
    }
  }
}

function evaluateVisibilityTransition(project) {
  const findings = [];
  const collaborators = collaboratorById(project);
  const objects = objectById(project);

  validateEvidenceIntegrity(project, findings);

  if (project.workspace.currentVisibility === project.workspace.requestedVisibility) {
    addFinding(
      findings,
      "low",
      "visibility-transition-noop",
      `Workspace is already ${project.workspace.requestedVisibility}.`,
      "Skip transition processing and emit a no-op audit receipt.",
      [project.workspace.id]
    );
  }

  for (const role of project.policy.requiredApproverRoles) {
    const approver = project.collaborators.find((collaborator) => collaborator.role === role);
    if (!approver || approver.consent !== "approved") {
      addFinding(
        findings,
        "critical",
        "required-visibility-approver-missing",
        `Required ${role} approval is not complete.`,
        "Block public visibility until all required governance approvers consent.",
        [role]
      );
    }
  }

  for (const collaborator of project.collaborators) {
    if (project.policy.publicProfileRequiresConsent && !collaborator.profilePublic && collaborator.consent !== "approved") {
      addFinding(
        findings,
        collaborator.role === "external-partner" ? "high" : "medium",
        "profile-exposure-consent-missing",
        `${collaborator.id} has no approved consent for public profile exposure.`,
        "Hide the collaborator from public profile surfaces or collect explicit consent before transition.",
        [collaborator.id, collaborator.role]
      );
    }
  }

  for (const object of project.objects) {
    const sensitiveLabels = object.labels.filter((label) => project.policy.sensitiveLabels.includes(label));
    if (sensitiveLabels.length > 0) {
      addFinding(
        findings,
        "critical",
        "sensitive-object-in-public-transition",
        `${object.title} carries sensitive labels: ${sensitiveLabels.join(", ")}.`,
        "Exclude or redact the object before public visibility is applied.",
        [object.id, ...sensitiveLabels]
      );
    }

    if (!project.policy.allowedPublicObjectKinds.includes(object.kind)) {
      addFinding(
        findings,
        "high",
        "object-kind-not-public-allowlisted",
        `${object.kind} object ${object.id} is not allowlisted for public visibility.`,
        "Map the object to a public-safe derivative or keep it private.",
        [object.id, object.kind]
      );
    }

    if (object.permission === "edit" || object.permission === "download") {
      addFinding(
        findings,
        object.permission === "download" ? "critical" : "high",
        "unsafe-public-object-permission",
        `${object.id} would expose ${object.permission} permission after transition.`,
        "Downgrade public permissions to read-only metadata or remove public access.",
        [object.id, object.permission]
      );
    }

    if (!object.publicReady) {
      addFinding(
        findings,
        "high",
        "object-not-public-ready",
        `${object.title} is not marked public-ready.`,
        "Require owner/steward readiness attestation before making the object public.",
        [object.id]
      );
    }

    if (!collaborators.has(object.ownerId)) {
      addFinding(
        findings,
        "medium",
        "object-owner-missing",
        `${object.id} references missing owner ${object.ownerId}.`,
        "Repair owner attribution before the public audit packet is emitted.",
        [object.id, object.ownerId]
      );
    }
  }

  for (const hold of activeHolds(project)) {
    for (const objectId of hold.objectIds) {
      const object = objects.get(objectId);
      addFinding(
        findings,
        "critical",
        "active-hold-blocks-public-transition",
        `${hold.kind} hold ${hold.id} blocks public exposure of ${object ? object.title : objectId}.`,
        "Block the visibility transition until the hold expires or a documented waiver is attached.",
        [hold.id, objectId, hold.expiresAt]
      );
    }
  }

  for (const invite of project.externalAccess) {
    if (!collaborators.has(invite.collaboratorId)) {
      addFinding(
        findings,
        "high",
        "external-access-principal-unknown",
        `External access ${invite.id} references unknown principal ${invite.collaboratorId}.`,
        "Revoke or identify unknown external access before public transition.",
        [invite.id, invite.collaboratorId]
      );
    }
    if (invite.access === "download" && !invite.allowsRedistribution) {
      addFinding(
        findings,
        "high",
        "external-download-without-redistribution-rights",
        `External access ${invite.id} allows downloads without redistribution rights.`,
        "Downgrade or revoke external download grants before public visibility changes.",
        [invite.id]
      );
    }
  }

  if (project.auditEvents.length < project.policy.minimumAuditEvents) {
    addFinding(
      findings,
      "medium",
      "visibility-audit-evidence-incomplete",
      `Only ${project.auditEvents.length} audit events are present for the transition.`,
      "Record requester, approver, object-review, and final decision events before applying visibility.",
      [project.workspace.id]
    );
  }

  const severitySummary = findings.reduce(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
  const score = Math.max(0, 100 - findings.reduce((sum, finding) => sum + SEVERITY_WEIGHTS[finding.severity], 0));

  return { findings, severitySummary, score };
}

function decisionFromEvaluation(evaluation) {
  if (evaluation.severitySummary.critical > 0) {
    return "block-public-visibility-transition";
  }
  if (evaluation.severitySummary.high > 0 || evaluation.score < 75) {
    return "hold-transition-for-governance-review";
  }
  if (evaluation.score < 90) {
    return "manual-review-before-publication";
  }
  if (evaluation.findings.some((finding) => finding.rule === "visibility-transition-noop")) {
    return "skip-noop-visibility-transition";
  }
  return "visibility-transition-ready";
}

function buildTransitionActions(findings) {
  return findings.map((finding) => ({
    priority: finding.severity === "critical" || finding.severity === "high" ? "blocking" : "review",
    rule: finding.rule,
    action: finding.action,
    refs: finding.refs
  }));
}

function buildReviewPacket(project) {
  const evaluation = evaluateVisibilityTransition(project);
  return {
    guard: "project-visibility-transition-guard",
    issue: "SCIBASE-AI/SCIBASE.AI#11",
    workspaceId: project.workspace.id,
    title: project.workspace.title,
    currentVisibility: project.workspace.currentVisibility,
    requestedVisibility: project.workspace.requestedVisibility,
    asOfDate: project.asOfDate,
    decision: decisionFromEvaluation(evaluation),
    score: evaluation.score,
    severitySummary: evaluation.severitySummary,
    findings: evaluation.findings,
    transitionActions: buildTransitionActions(evaluation.findings),
    safety: [
      "Synthetic project, collaborator, object, hold, access, and audit data only",
      "No OAuth, SAML, ORCID, storage, profile, permission, email, or audit-log network calls",
      "No private project data, credentials, human-subject records, live users, or access-control mutations"
    ]
  };
}

function renderMarkdownReport(packet) {
  const lines = [
    "# Project Visibility Transition Guard",
    "",
    `Workspace: ${packet.title}`,
    `Issue: ${packet.issue}`,
    `Transition: ${packet.currentVisibility} -> ${packet.requestedVisibility}`,
    `Decision: ${packet.decision}`,
    `Score: ${packet.score}`,
    "",
    "## Severity Summary",
    "",
    "| Severity | Count |",
    "| --- | ---: |"
  ];

  for (const severity of ["critical", "high", "medium", "low"]) {
    lines.push(`| ${severity} | ${packet.severitySummary[severity]} |`);
  }

  lines.push("", "## Findings", "");
  for (const finding of packet.findings) {
    lines.push(`- **${finding.severity} / ${finding.rule}**: ${finding.message}`);
    lines.push(`  - Action: ${finding.action}`);
    lines.push(`  - Refs: ${finding.refs.join(", ") || "none"}`);
  }

  lines.push("", "## Safety", "");
  for (const item of packet.safety) {
    lines.push(`- ${item}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(packet) {
  const barWidth = Math.max(44, Math.min(760, packet.score * 7.6));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Project visibility transition guard summary">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="48" y="66" font-family="Arial" font-size="34" font-weight="700" fill="#111827">Project Visibility Transition Guard</text>
  <text x="48" y="104" font-family="Arial" font-size="18" fill="#475569">${packet.currentVisibility} to ${packet.requestedVisibility} workspace review</text>
  <rect x="48" y="142" width="864" height="94" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="181" font-family="Arial" font-size="21" font-weight="700" fill="#b91c1c">${packet.decision}</text>
  <text x="76" y="213" font-family="Arial" font-size="17" fill="#334155">Critical ${packet.severitySummary.critical} | High ${packet.severitySummary.high} | Findings ${packet.findings.length}</text>
  <rect x="48" y="274" width="864" height="76" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="307" font-family="Arial" font-size="18" fill="#334155">Transition readiness score</text>
  <rect x="76" y="324" width="760" height="14" rx="7" fill="#e5e7eb"/>
  <rect x="76" y="324" width="${barWidth}" height="14" rx="7" fill="#7c3aed"/>
  <text x="852" y="339" font-family="Arial" font-size="16" text-anchor="end" fill="#111827">${packet.score}/100</text>
  <rect x="48" y="390" width="864" height="76" rx="8" fill="#f5f3ff" stroke="#c4b5fd"/>
  <text x="76" y="423" font-family="Arial" font-size="18" font-weight="700" fill="#5b21b6">Block unsafe public releases</text>
  <text x="76" y="451" font-family="Arial" font-size="16" fill="#5b21b6">Checks object permissions, sensitive labels, consent, holds, external access, and audit evidence.</text>
</svg>
`;
}

module.exports = {
  buildReviewPacket,
  decisionFromEvaluation,
  evaluateVisibilityTransition,
  renderMarkdownReport,
  renderSvgSummary
};
