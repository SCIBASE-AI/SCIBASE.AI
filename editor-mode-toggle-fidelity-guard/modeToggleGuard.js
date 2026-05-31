function difference(before = [], after = []) {
  const afterSet = new Set(after);
  return before.filter((item) => !afterSet.has(item));
}

function addFinding(findings, severity, id, message, action, evidence = {}) {
  findings.push({ severity, id, message, action, evidence });
}

function evaluateModeToggle(snapshot) {
  const findings = [];
  const beforeBlocks = new Map((snapshot.before || []).map((block) => [block.id, block]));
  const afterBlocks = new Map((snapshot.after || []).map((block) => [block.id, block]));

  for (const [id, before] of beforeBlocks.entries()) {
    const after = afterBlocks.get(id);
    if (!after) {
      addFinding(
        findings,
        "block",
        `missing-block:${id}`,
        `Block ${id} disappeared during ${snapshot.fromMode} to ${snapshot.toMode} conversion.`,
        "Reject the converted edit and restore the block from the pre-toggle snapshot.",
        { blockId: id }
      );
      continue;
    }

    const lostEquations = difference(before.equations, after.equations);
    if (lostEquations.length > 0) {
      addFinding(
        findings,
        "block",
        `equation-loss:${id}`,
        `Block ${id} lost equation tokens during mode toggle.`,
        "Keep the pre-toggle equation tokens or require manual equation review.",
        { blockId: id, lostEquations }
      );
    }

    const lostCitations = difference(before.citations, after.citations);
    if (lostCitations.length > 0) {
      addFinding(
        findings,
        "hold",
        `citation-loss:${id}`,
        `Block ${id} lost citation keys during mode toggle.`,
        "Rebind citation keys before accepting the converted edit.",
        { blockId: id, lostCitations }
      );
    }

    const lostNotebookLinks = difference(before.notebookLinks, after.notebookLinks);
    if (lostNotebookLinks.length > 0) {
      addFinding(
        findings,
        "hold",
        `notebook-link-loss:${id}`,
        `Block ${id} lost notebook-cell links during mode toggle.`,
        "Restore notebook-cell anchors before shared edit acceptance.",
        { blockId: id, lostNotebookLinks }
      );
    }

    const lostCommentAnchors = difference(before.commentAnchors, after.commentAnchors);
    if (lostCommentAnchors.length > 0) {
      addFinding(
        findings,
        "hold",
        `comment-anchor-loss:${id}`,
        `Block ${id} lost comment anchors during mode toggle.`,
        "Re-anchor comments or defer accepting the converted block.",
        { blockId: id, lostCommentAnchors }
      );
    }

    const lostSuggestions = difference(before.suggestionIds, after.suggestionIds);
    if (lostSuggestions.length > 0) {
      addFinding(
        findings,
        "block",
        `suggestion-loss:${id}`,
        `Block ${id} lost tracked suggestions during mode toggle.`,
        "Reject the conversion or preserve suggestion provenance.",
        { blockId: id, lostSuggestions }
      );
    }

    if (before.locked && before.contentHash !== after.contentHash && !after.lockOwnerApprovalId) {
      addFinding(
        findings,
        "block",
        `locked-block-mutation:${id}`,
        `Locked block ${id} changed during mode toggle without owner approval.`,
        "Require lock-owner approval before accepting the converted edit.",
        { blockId: id, beforeHash: before.contentHash, afterHash: after.contentHash }
      );
    }
  }

  const blockers = findings.filter((finding) => finding.severity === "block").length;
  const holds = findings.filter((finding) => finding.severity === "hold").length;

  return {
    documentId: snapshot.documentId,
    fromMode: snapshot.fromMode,
    toMode: snapshot.toMode,
    decision: blockers > 0 ? "block-mode-toggle-edit" : holds > 0 ? "hold-for-editor-review" : "ready-to-accept-toggle",
    summary: {
      blocks: beforeBlocks.size,
      blockers,
      holds,
      findings: findings.length
    },
    findings
  };
}

function toMarkdown(result) {
  const rows = result.findings.map((finding) => `| ${finding.severity} | ${finding.message} | ${finding.action} |`);
  return [
    "# Editor Mode Toggle Fidelity Guard Report",
    "",
    `Document: ${result.documentId}`,
    `Mode switch: ${result.fromMode} -> ${result.toMode}`,
    `Decision: ${result.decision}`,
    "",
    "| Severity | Finding | Action |",
    "| --- | --- | --- |",
    ...(rows.length ? rows : ["| ok | No mode-toggle fidelity issues found. | Accept the converted edit. |"]),
    ""
  ].join("\n");
}

function toSvg(result) {
  const color = result.decision === "ready-to-accept-toggle" ? "#0f7b45" : result.decision === "hold-for-editor-review" ? "#9a6700" : "#b42318";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="220" viewBox="0 0 760 220" role="img" aria-label="Mode toggle fidelity guard summary">`,
    `<rect width="760" height="220" fill="#f8fafc"/>`,
    `<rect x="30" y="28" width="700" height="164" rx="8" fill="#ffffff" stroke="#d0d7de"/>`,
    `<text x="54" y="72" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111827">Mode Toggle Fidelity Guard</text>`,
    `<text x="54" y="112" font-family="Arial, sans-serif" font-size="18" fill="${color}">Decision: ${result.decision}</text>`,
    `<text x="54" y="146" font-family="Arial, sans-serif" font-size="16" fill="#374151">Blockers: ${result.summary.blockers} | Holds: ${result.summary.holds} | Blocks: ${result.summary.blocks}</text>`,
    `<text x="54" y="174" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">${result.fromMode} to ${result.toMode} / ${result.documentId}</text>`,
    `</svg>`
  ].join("\n");
}

module.exports = {
  evaluateModeToggle,
  toMarkdown,
  toSvg
};
