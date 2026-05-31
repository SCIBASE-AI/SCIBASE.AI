function addFinding(findings, severity, id, message, action, evidence = {}) {
  findings.push({ severity, id, message, action, evidence });
}

function evaluateMentionFanout(workspace) {
  const findings = [];
  const usersById = new Map((workspace.users || []).map((user) => [user.id, user]));
  const sectionsById = new Map((workspace.sections || []).map((section) => [section.id, section]));
  const cellsById = new Map((workspace.notebookCells || []).map((cell) => [cell.id, cell]));

  for (const thread of workspace.chatThreads || []) {
    const section = sectionsById.get(thread.sectionId);

    if (!section) {
      addFinding(
        findings,
        "block",
        `unknown-section:${thread.id}`,
        `Thread ${thread.id} targets an unknown document section.`,
        "Resolve the thread section before creating mention fanout.",
        { threadId: thread.id, sectionId: thread.sectionId }
      );
      continue;
    }

    for (const mentionId of thread.mentions || []) {
      const user = usersById.get(mentionId);
      if (!user) {
        addFinding(
          findings,
          "block",
          `unknown-mention:${thread.id}:${mentionId}`,
          `Thread ${thread.id} mentions an unknown collaborator ${mentionId}.`,
          "Drop or resolve unknown collaborators before fanout.",
          { threadId: thread.id, mentionId }
        );
        continue;
      }

      if (!section.members.includes(mentionId)) {
        addFinding(
          findings,
          "hold",
          `section-scope:${thread.id}:${mentionId}`,
          `${user.displayName} is mentioned outside their allowed section scope.`,
          "Invite the collaborator to the section or remove the mention.",
          { threadId: thread.id, sectionId: section.id, mentionId }
        );
      }

      if (user.role === "blinded-reviewer" && thread.visibility === "author-visible") {
        addFinding(
          findings,
          "block",
          `blinded-reviewer-leak:${thread.id}:${mentionId}`,
          `Author-visible thread ${thread.id} would reveal blinded reviewer ${user.displayName}.`,
          "Redact the reviewer mention or move the message to a reviewer-only thread.",
          { threadId: thread.id, mentionId }
        );
      }

      if (user.external && section.restricted) {
        addFinding(
          findings,
          "block",
          `external-restricted-section:${thread.id}:${mentionId}`,
          `External collaborator ${user.displayName} is mentioned in restricted section ${section.id}.`,
          "Remove the mention or approve restricted-section access before fanout.",
          { threadId: thread.id, sectionId: section.id, mentionId }
        );
      }

      if (thread.notebookCellId) {
        const cell = cellsById.get(thread.notebookCellId);
        if (!cell || !cell.allowedUsers.includes(mentionId)) {
          addFinding(
            findings,
            "hold",
            `notebook-cell-scope:${thread.id}:${mentionId}`,
            `${user.displayName} is mentioned on notebook cell ${thread.notebookCellId} without cell access.`,
            "Grant cell access or move the mention to a document-level thread.",
            { threadId: thread.id, notebookCellId: thread.notebookCellId, mentionId }
          );
        }
      }
    }

    if (section.locked && thread.mentions.length > 0 && !thread.sectionOwnerApproved) {
      addFinding(
        findings,
        "hold",
        `locked-section-mention:${thread.id}`,
        `Thread ${thread.id} mentions collaborators inside locked section ${section.id} without owner approval.`,
        "Ask the section owner to approve the mention fanout or defer it until unlock.",
        { threadId: thread.id, sectionId: section.id }
      );
    }

    if (section.privateTitle && thread.fanoutPreview && thread.fanoutPreview.includes(section.title)) {
      addFinding(
        findings,
        "hold",
        `private-title-preview:${thread.id}`,
        `Thread ${thread.id} fanout preview includes a private section title.`,
        "Redact the section title in the mention preview before alerting collaborators.",
        { threadId: thread.id, sectionId: section.id }
      );
    }
  }

  const blockers = findings.filter((finding) => finding.severity === "block").length;
  const holds = findings.filter((finding) => finding.severity === "hold").length;

  return {
    workspaceId: workspace.id,
    decision: blockers > 0 ? "block-mention-fanout" : holds > 0 ? "hold-for-thread-owner" : "ready-for-mention-fanout",
    summary: {
      threads: (workspace.chatThreads || []).length,
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
    "# Chat Mention Scope Guard Report",
    "",
    `Workspace: ${result.workspaceId}`,
    `Decision: ${result.decision}`,
    "",
    "| Severity | Finding | Action |",
    "| --- | --- | --- |",
    ...(rows.length ? rows : ["| ok | No mention-scope issues found. | Mention fanout may continue. |"]),
    ""
  ].join("\n");
}

function toSvg(result) {
  const color = result.decision === "ready-for-mention-fanout" ? "#0f7b45" : result.decision === "hold-for-thread-owner" ? "#9a6700" : "#b42318";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="220" viewBox="0 0 760 220" role="img" aria-label="Mention scope guard summary">`,
    `<rect width="760" height="220" fill="#f8fafc"/>`,
    `<rect x="30" y="28" width="700" height="164" rx="8" fill="#ffffff" stroke="#d0d7de"/>`,
    `<text x="54" y="72" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111827">Chat Mention Scope Guard</text>`,
    `<text x="54" y="112" font-family="Arial, sans-serif" font-size="18" fill="${color}">Decision: ${result.decision}</text>`,
    `<text x="54" y="146" font-family="Arial, sans-serif" font-size="16" fill="#374151">Blockers: ${result.summary.blockers} | Holds: ${result.summary.holds} | Threads: ${result.summary.threads}</text>`,
    `<text x="54" y="174" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">Workspace ${result.workspaceId}</text>`,
    `</svg>`
  ].join("\n");
}

module.exports = {
  evaluateMentionFanout,
  toMarkdown,
  toSvg
};
