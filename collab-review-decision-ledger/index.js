const crypto = require("crypto");

const FLAG_WEIGHTS = {
  BLOCKING_COMMENT_OPEN: 4,
  OPEN_SUGGESTION: 2,
  NOTEBOOK_OUTPUT_STALE: 4,
  APPROVAL_MISSING: 3,
  SECTION_UNLOCKED: 2,
  DECISION_RECORD_MISSING: 2,
  RESTORE_SNAPSHOT_UNSAFE: 3,
};

function evaluateReviewDecision({ manuscript, generatedAt = new Date().toISOString() }) {
  if (!manuscript || !Array.isArray(manuscript.sections)) {
    throw new Error("manuscript.sections is required");
  }

  const sectionDecisions = manuscript.sections.map((section) =>
    evaluateSection(section, manuscript.requiredApprovers || [], generatedAt)
  );

  const audit = {
    generatedAt,
    documentId: manuscript.documentId,
    title: manuscript.title,
    sectionDecisions,
  };
  audit.releaseSummary = buildReleaseSummary(audit);
  return audit;
}

function evaluateSection(section, requiredApprovers, generatedAt) {
  const flags = [];
  const blockingComments = (section.comments || []).filter(
    (comment) => comment.severity === "blocking" && comment.resolved !== true
  );
  if (blockingComments.length > 0) {
    flags.push("BLOCKING_COMMENT_OPEN");
  }

  const openSuggestions = (section.suggestions || []).filter(
    (suggestion) => !["accepted", "rejected"].includes(suggestion.status)
  );
  if (openSuggestions.length > 0) {
    flags.push("OPEN_SUGGESTION");
  }

  const staleNotebooks = (section.notebookOutputs || []).filter(
    (output) => output.status === "stale" || output.sourceHash !== output.currentSourceHash
  );
  if (staleNotebooks.length > 0) {
    flags.push("NOTEBOOK_OUTPUT_STALE");
  }

  const approvedRoles = new Set((section.approvals || [])
    .filter((approval) => approval.status === "approved")
    .map((approval) => approval.role));
  const missingApprovals = requiredApprovers.filter((role) => !approvedRoles.has(role));
  if (missingApprovals.length > 0) {
    flags.push("APPROVAL_MISSING");
  }

  if (!section.lock || section.lock.mode !== "freeze-window") {
    flags.push("SECTION_UNLOCKED");
  }

  const recordedDecisions = (section.decisionRecords || []).filter(
    (decision) => decision.status === "recorded" && String(decision.text || "").trim()
  );
  if (recordedDecisions.length === 0) {
    flags.push("DECISION_RECORD_MISSING");
  }

  if (!section.snapshot || section.snapshot.restoreReady !== true) {
    flags.push("RESTORE_SNAPSHOT_UNSAFE");
  }

  const riskScore = flags.reduce((total, flag) => total + FLAG_WEIGHTS[flag], 0);
  const decision = riskScore === 0 ? "ready_to_freeze" : "hold_publish";
  const sectionDecision = {
    sectionId: section.id,
    sectionTitle: section.title,
    generatedAt,
    decision,
    flags,
    riskScore,
    blockingComments: blockingComments.map((comment) => comment.id),
    openSuggestions: openSuggestions.map((suggestion) => suggestion.id),
    staleNotebooks: staleNotebooks.map((output) => output.id),
    missingApprovals,
    releaseActions: buildReleaseActions({
      decision,
      blockingComments,
      openSuggestions,
      staleNotebooks,
      missingApprovals,
      section,
    }),
  };
  sectionDecision.decisionDigest = createDecisionDigest(sectionDecision);
  return sectionDecision;
}

function buildReleaseActions({
  decision,
  blockingComments,
  openSuggestions,
  staleNotebooks,
  missingApprovals,
  section,
}) {
  if (decision === "ready_to_freeze") {
    return ["Keep section frozen for publish review"];
  }

  const actions = [];
  if (blockingComments.length > 0) {
    actions.push(`Resolve ${formatCount(blockingComments.length, "blocking comment")} in ${section.title}`);
  }
  if (openSuggestions.length > 0) {
    actions.push(`Accept or reject ${formatCount(openSuggestions.length, "open suggestion")} in ${section.title}`);
  }
  if (staleNotebooks.length > 0) {
    actions.push(`Refresh ${formatCount(staleNotebooks.length, "stale notebook output")} before freeze`);
  }
  if (missingApprovals.length > 0) {
    actions.push(`Collect approval from ${missingApprovals.join(", ")}`);
  }
  if (!section.lock || section.lock.mode !== "freeze-window") {
    actions.push(`Move ${section.title} into freeze-window lock mode`);
  }
  if (!section.snapshot || section.snapshot.restoreReady !== true) {
    actions.push(`Create restore-ready snapshot for ${section.title}`);
  }
  return actions;
}

function buildReleaseSummary(audit) {
  const sections = audit.sectionDecisions || [];
  const counts = {
    sections: sections.length,
    readyToFreeze: sections.filter((section) => section.decision === "ready_to_freeze").length,
    holdPublish: sections.filter((section) => section.decision === "hold_publish").length,
    blockingComments: sum(sections, "blockingComments"),
    staleNotebooks: sum(sections, "staleNotebooks"),
    missingApprovals: sum(sections, "missingApprovals"),
  };

  const priorityActions = [];
  if (counts.holdPublish > 0) {
    priorityActions.push(`Hold publish: ${formatCount(counts.holdPublish, "section")} has unresolved release blockers.`);
  }
  if (counts.blockingComments > 0) {
    priorityActions.push(`Resolve ${formatCount(counts.blockingComments, "blocking comment")} before freeze.`);
  }
  if (counts.staleNotebooks > 0) {
    priorityActions.push(`Refresh ${formatCount(counts.staleNotebooks, "stale notebook output")} before release.`);
  }
  if (counts.missingApprovals > 0) {
    priorityActions.push(`Collect ${formatCount(counts.missingApprovals, "missing role approval")} before publish.`);
  }

  return { counts, priorityActions };
}

function createDecisionDigest(sectionDecision) {
  const stableFacts = {
    sectionId: sectionDecision.sectionId,
    decision: sectionDecision.decision,
    flags: [...(sectionDecision.flags || [])].sort(),
    blockingComments: [...(sectionDecision.blockingComments || [])].sort(),
    openSuggestions: [...(sectionDecision.openSuggestions || [])].sort(),
    staleNotebooks: [...(sectionDecision.staleNotebooks || [])].sort(),
    missingApprovals: [...(sectionDecision.missingApprovals || [])].sort(),
    riskScore: sectionDecision.riskScore,
  };
  return `crdl_${crypto.createHash("sha256").update(JSON.stringify(stableFacts)).digest("hex").slice(0, 24)}`;
}

function sum(items, key) {
  return items.reduce((total, item) => total + ((item[key] || []).length), 0);
}

function formatCount(count, label) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

module.exports = {
  evaluateReviewDecision,
  buildReleaseSummary,
  createDecisionDigest,
};
