function rangesOverlap(left, right) {
  return left[0] < right[1] && right[0] < left[1];
}

function userHasRole(documentState, actor, role) {
  const user = (documentState.users || []).find((candidate) => candidate.id === actor);
  return Boolean(user && (user.roles || []).includes(role));
}

function findSection(documentState, sectionId) {
  return (documentState.sections || []).find((section) => section.id === sectionId);
}

function findOperation(documentState, operationId) {
  return (documentState.operations || []).find((operation) => operation.id === operationId);
}

function laterConflictingOperations(documentState, target, request) {
  return (documentState.operations || []).filter((operation) => {
    if (operation.id === target.id) return false;
    if (operation.sectionId !== target.sectionId) return false;
    if (operation.version <= target.version) return false;
    if (operation.type === "comment") return false;
    return rangesOverlap(operation.range || [0, 0], target.range || [0, 0]);
  });
}

function addIssue(issues, severity, code, message, context) {
  issues.push({ severity, code, message, context });
}

function evaluateRequest(documentState, request) {
  const issues = [];
  const actions = [];
  const target = findOperation(documentState, request.targetOperationId);

  if (!target) {
    addIssue(issues, "critical", "missing-target-operation", "Undo/redo target operation was not found.", request.targetOperationId);
    return finalizeRequest(request, issues, ["Reject request and ask client to refresh operation history."]);
  }

  const section = findSection(documentState, target.sectionId);
  if (!section) {
    addIssue(issues, "critical", "missing-section", "Target section was not found.", target.sectionId);
  }

  const actorIsEditor = userHasRole(documentState, request.actor, "editor");
  if (request.actor !== target.actor && !actorIsEditor) {
    addIssue(issues, "critical", "cross-author-undo", "Author attempted to undo another collaborator's operation.", target.id);
    actions.push("Require explicit editor override before applying the inverse operation.");
  }

  if (section && request.baseSectionVersion < section.version && !actorIsEditor) {
    addIssue(issues, "high", "stale-section-version", "Undo/redo request is based on an older section version.", section.id);
    actions.push("Rebase the inverse operation against the latest section version.");
  }

  const conflicts = laterConflictingOperations(documentState, target, request);
  if (conflicts.length > 0) {
    addIssue(issues, "critical", "intervening-range-conflict", "Newer edits overlap the target range.", conflicts.map((operation) => operation.id).join(", "));
    actions.push("Open a conflict review instead of applying the undo automatically.");
  }

  if (section && section.locked && section.lockOwner !== request.actor && !actorIsEditor) {
    addIssue(issues, "critical", "locked-section-side-path", "Undo/redo would mutate a locked final-review section.", section.id);
    actions.push("Require lock-owner approval before inverse operation application.");
  }

  if (target.type === "execute-notebook-cell" && !request.restoreSnapshot) {
    addIssue(issues, "high", "missing-notebook-output-snapshot", "Notebook execution undo/redo lacks an output restore snapshot.", target.id);
    actions.push("Attach notebook output and execution-count snapshot before mutation.");
  }

  if (target.type === "comment" && target.protectedAnchor && request.actor !== target.actor && !actorIsEditor) {
    addIssue(issues, "critical", "protected-comment-anchor-delete", "Undo request would remove another reviewer's anchored comment.", target.id);
    actions.push("Keep the reviewer comment and create a separate resolution task.");
  }

  if (request.type === "redo") {
    const priorUndo = findOperation(documentState, request.priorUndoId);
    if (!priorUndo || priorUndo.inverseOf !== target.id) {
      addIssue(issues, "critical", "missing-prior-undo", "Redo request does not reference a matching prior undo operation.", request.priorUndoId);
      actions.push("Reject redo until the client provides a matching undo record.");
    }
  }

  if (actions.length === 0) {
    actions.push("Apply inverse operation and append an audit event with target operation, actor, and snapshot hash.");
  }

  return finalizeRequest(request, issues, actions);
}

function finalizeRequest(request, issues, actions) {
  const critical = issues.filter((issue) => issue.severity === "critical").length;
  const high = issues.filter((issue) => issue.severity === "high").length;
  const decision = critical > 0 ? "block" : high > 0 ? "defer" : "allow";
  const score = Math.max(0, 100 - critical * 35 - high * 15);
  return {
    requestId: request.id,
    actor: request.actor,
    type: request.type,
    targetOperationId: request.targetOperationId,
    decision,
    provenanceScore: score,
    issueCounts: issues.reduce((counts, issue) => {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
      return counts;
    }, {}),
    issues,
    actions: Array.from(new Set(actions)),
  };
}

function evaluateUndoRedoBatch(documentState, requests) {
  const results = requests.map((request) => evaluateRequest(documentState, request));
  const summary = {
    requestCount: results.length,
    allowed: results.filter((result) => result.decision === "allow").length,
    deferred: results.filter((result) => result.decision === "defer").length,
    blocked: results.filter((result) => result.decision === "block").length,
    averageProvenanceScore: Math.round(results.reduce((sum, result) => sum + result.provenanceScore, 0) / results.length),
  };

  return {
    generatedAt: new Date("2026-05-28T00:00:00Z").toISOString(),
    requirementMap: [
      "Real-time collaboration: validates inverse operations before shared document mutation.",
      "Version history and autosave: ties undo/redo to section versions and restore snapshots.",
      "Rich scientific editing: protects notebook outputs, final-review sections, comments, and task anchors.",
      "Audit logs: emits reviewer-ready allow, defer, or block decisions for every request.",
    ],
    summary,
    results,
  };
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMarkdownReport(report) {
  const lines = [
    "# Undo Redo Provenance Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Requests reviewed: ${report.summary.requestCount}`,
    `- Allowed: ${report.summary.allowed}`,
    `- Deferred: ${report.summary.deferred}`,
    `- Blocked: ${report.summary.blocked}`,
    `- Average provenance score: ${report.summary.averageProvenanceScore}`,
    "",
    "## Requirement Map",
    "",
    ...report.requirementMap.map((item) => `- ${item}`),
    "",
    "## Request Decisions",
    "",
  ];

  for (const result of report.results) {
    lines.push(`### ${result.requestId}`);
    lines.push("");
    lines.push(`- Decision: ${result.decision}`);
    lines.push(`- Provenance score: ${result.provenanceScore}`);
    lines.push(`- Issues: ${result.issues.length}`);
    for (const action of result.actions) {
      lines.push(`- Action: ${action}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderSvgReport(report) {
  const width = 1120;
  const rowHeight = 78;
  const height = 146 + report.results.length * rowHeight;
  const rows = report.results
    .map((result, index) => {
      const y = 110 + index * rowHeight;
      const color = result.decision === "allow" ? "#2f9e44" : result.decision === "defer" ? "#f08c00" : "#d6336c";
      const barWidth = Math.max(24, Math.round(result.provenanceScore * 5.2));
      return `
  <g transform="translate(40 ${y})">
    <text x="0" y="0" class="title">${escapeHtml(result.requestId)}</text>
    <text x="0" y="24" class="meta">Decision: ${escapeHtml(result.decision)} | Issues: ${result.issues.length}</text>
    <rect x="430" y="-18" width="540" height="22" rx="4" fill="#e9ecef"/>
    <rect x="430" y="-18" width="${barWidth}" height="22" rx="4" fill="${color}"/>
    <text x="990" y="0" class="score">${result.provenanceScore}</text>
  </g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .page { fill: #f8f9fa; }
    .heading { font: 700 34px Arial, sans-serif; fill: #17202a; }
    .sub { font: 16px Arial, sans-serif; fill: #495057; }
    .title { font: 700 18px Arial, sans-serif; fill: #212529; }
    .meta { font: 14px Arial, sans-serif; fill: #495057; }
    .score { font: 700 18px Arial, sans-serif; fill: #212529; text-anchor: end; }
  </style>
  <rect class="page" width="${width}" height="${height}"/>
  <text x="40" y="54" class="heading">Collaborative Undo Redo Provenance Guard</text>
  <text x="40" y="84" class="sub">Blocks unsafe inverse operations before shared manuscript mutation.</text>
${rows}
</svg>
`;
}

module.exports = {
  evaluateRequest,
  evaluateUndoRedoBatch,
  renderMarkdownReport,
  renderSvgReport,
  rangesOverlap,
};
