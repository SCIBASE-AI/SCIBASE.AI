const DEFAULT_POLICY = Object.freeze({
  generatedAt: "2026-05-22T00:00:00.000Z",
  allowedExternalHosts: ["doi.org", "api.datacite.org"],
  unsafeMacroCommands: [
    "\\href",
    "\\includegraphics",
    "\\htmlClass",
    "\\htmlId",
    "\\htmlStyle",
    "\\url",
  ],
  rawHtmlPattern: /<\s*(script|iframe|object|embed|link|meta|style)\b/i,
  externalUrlPattern: /https?:\/\/([^)\s"']+)/gi,
  maxExpansionDepth: 8,
});

const REQUIREMENT_MAP = Object.freeze({
  scientific_formatting:
    "Rich Scientific Formatting: Markdown, LaTeX, equations, and cross references",
  realtime_collaboration:
    "Real-Time Collaboration: multi-user edits with live render safety",
  locking:
    "Real-Time Collaboration: controlled sections and lock/unlock modes",
  version_history:
    "Version History & Autosave: safe named-version export",
});

function evaluateMacroPacket(packet, policy = DEFAULT_POLICY) {
  assertPacket(packet);

  const checks = [];
  const issues = [];
  const addCheck = (code, passed, detail) => {
    checks.push({ code, passed, detail });
  };
  const addIssue = (
    severity,
    code,
    message,
    requirement,
    remediation,
    target,
  ) => {
    issues.push({
      severity,
      code,
      message,
      requirement,
      remediation,
      target,
    });
  };

  const macroGroups = groupMacros(packet.macros);
  checkMacroConflicts(macroGroups, addCheck, addIssue);
  checkUnsafeMacroCommands(packet, policy, addCheck, addIssue);
  checkMacroRecursion(packet, policy, addCheck, addIssue);
  checkBlockContent(packet, policy, addCheck, addIssue);
  checkLockedSection(packet, addCheck, addIssue);

  const blockingIssues = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const status =
    blockingIssues.length > 0
      ? "blocked"
      : warnings.length > 0
        ? "needs_review"
        : "ready";

  return {
    generatedAt: policy.generatedAt,
    packetId: packet.packetId,
    documentId: packet.documentId,
    namedVersion: packet.namedVersion,
    sectionId: packet.sectionId,
    status,
    summary: {
      macros: packet.macros.length,
      blocks: packet.blocks.length,
      checks: checks.length,
      passedChecks: checks.filter((check) => check.passed).length,
      blockingIssues: blockingIssues.length,
      warnings: warnings.length,
    },
    checks,
    issues: issues.sort(compareIssues),
    renderDecision: buildRenderDecision(status, issues),
    requirementCoverage: REQUIREMENT_MAP,
  };
}

function createGuardReport(packets, policy = DEFAULT_POLICY) {
  const evaluations = packets
    .map((packet) => evaluateMacroPacket(packet, policy))
    .sort((a, b) => a.packetId.localeCompare(b.packetId));

  return {
    generatedAt: policy.generatedAt,
    guard: "collaborative-latex-macro-safety-guard",
    issue: "SCIBASE-AI/SCIBASE.AI#12",
    totals: {
      packets: evaluations.length,
      ready: evaluations.filter((item) => item.status === "ready").length,
      needsReview: evaluations.filter((item) => item.status === "needs_review")
        .length,
      blocked: evaluations.filter((item) => item.status === "blocked").length,
      blockingIssues: evaluations.reduce(
        (sum, item) => sum + item.summary.blockingIssues,
        0,
      ),
      warnings: evaluations.reduce((sum, item) => sum + item.summary.warnings, 0),
    },
    evaluations,
  };
}

function renderMarkdown(report) {
  const rows = report.evaluations
    .map(
      (item) =>
        `| ${item.packetId} | ${item.namedVersion} | ${item.status} | ${item.summary.blockingIssues} | ${item.summary.warnings} |`,
    )
    .join("\n");
  const issueRows =
    report.evaluations
      .flatMap((item) =>
        item.issues.map(
          (issue) =>
            `- ${item.packetId} ${issue.code} (${issue.target}): ${issue.remediation}`,
        ),
      )
      .join("\n") || "- No remediation required.";

  return `# Collaborative LaTeX Macro Safety Guard

Synthetic reviewer packet for ${report.issue}.

## Summary

| Packet | Named version | Status | Blocking issues | Warnings |
| --- | --- | --- | ---: | ---: |
${rows}

## Gate Totals

- Ready packets: ${report.totals.ready}
- Needs review: ${report.totals.needsReview}
- Blocked packets: ${report.totals.blocked}
- Blocking issues: ${report.totals.blockingIssues}
- Warnings: ${report.totals.warnings}

## Remediation Queue

${issueRows}

## Requirement Mapping

- Macro and equation safety: ${REQUIREMENT_MAP.scientific_formatting}
- Multi-user macro edit checks: ${REQUIREMENT_MAP.realtime_collaboration}
- Locked section render holds: ${REQUIREMENT_MAP.locking}
- Named-version export gate: ${REQUIREMENT_MAP.version_history}
`;
}

function renderSvg(report) {
  const width = 960;
  const height = 540;
  const cardWidth = 280;
  const colors = {
    ready: "#157f57",
    needs_review: "#b7791f",
    blocked: "#b42318",
  };
  const cards = report.evaluations
    .map((item, index) => {
      const x = 40 + index * (cardWidth + 20);
      const color = colors[item.status];
      return `<g>
  <rect x="${x}" y="170" width="${cardWidth}" height="230" rx="8" fill="#ffffff" stroke="#d0d7de"/>
  <rect x="${x}" y="170" width="${cardWidth}" height="10" rx="8" fill="${color}"/>
  <text x="${x + 18}" y="215" fill="#111827" font-size="16" font-family="Arial, sans-serif">${escapeXml(item.packetId)}</text>
  <text x="${x + 18}" y="245" fill="#4b5563" font-size="14" font-family="Arial, sans-serif">${escapeXml(item.sectionId)}</text>
  <text x="${x + 18}" y="295" fill="${color}" font-size="30" font-family="Arial, sans-serif" font-weight="700">${escapeXml(item.status)}</text>
  <text x="${x + 18}" y="340" fill="#111827" font-size="16" font-family="Arial, sans-serif">Checks: ${item.summary.passedChecks}/${item.summary.checks}</text>
  <text x="${x + 18}" y="370" fill="#111827" font-size="16" font-family="Arial, sans-serif">Blocks: ${item.summary.blockingIssues}</text>
</g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">Collaborative LaTeX macro safety guard</title>
<desc id="desc">Deterministic status report for real-time editor macro render packets.</desc>
<rect width="${width}" height="${height}" fill="#f6f8fa"/>
<text x="40" y="70" fill="#111827" font-size="34" font-family="Arial, sans-serif" font-weight="700">Collaborative LaTeX Macro Safety Guard</text>
<text x="40" y="108" fill="#4b5563" font-size="18" font-family="Arial, sans-serif">Blocks unsafe macros, raw HTML, recursive edits, and locked-section render risks.</text>
<g>
  <rect x="40" y="125" width="190" height="28" rx="6" fill="#e6f4ea"/>
  <text x="54" y="145" fill="#157f57" font-size="14" font-family="Arial, sans-serif">Ready ${report.totals.ready}</text>
  <rect x="250" y="125" width="190" height="28" rx="6" fill="#fff4d6"/>
  <text x="264" y="145" fill="#8a5a00" font-size="14" font-family="Arial, sans-serif">Needs review ${report.totals.needsReview}</text>
  <rect x="460" y="125" width="190" height="28" rx="6" fill="#ffebe9"/>
  <text x="474" y="145" fill="#b42318" font-size="14" font-family="Arial, sans-serif">Blocked ${report.totals.blocked}</text>
</g>
${cards}
<text x="40" y="470" fill="#4b5563" font-size="15" font-family="Arial, sans-serif">Issue mapping: real-time collaborative editor, Markdown/LaTeX rendering, live collaboration, versioned export.</text>
</svg>
`;
}

function checkMacroConflicts(macroGroups, addCheck, addIssue) {
  for (const [name, macros] of [...macroGroups.entries()].sort()) {
    const bodies = new Set(macros.map((macro) => macro.body));
    const passed = bodies.size === 1;
    addCheck("MACRO_CONFLICT", passed, `${name}; definitions=${bodies.size}`);
    if (!passed) {
      addIssue(
        "error",
        "MACRO_DEFINITION_CONFLICT",
        "Collaborators submitted conflicting bodies for the same macro.",
        REQUIREMENT_MAP.realtime_collaboration,
        "Resolve the macro conflict before broadcasting the shared render state.",
        name,
      );
    }
  }
}

function checkUnsafeMacroCommands(packet, policy, addCheck, addIssue) {
  for (const macro of packet.macros) {
    const used = policy.unsafeMacroCommands.filter((command) =>
      macro.body.includes(command),
    );
    const trusted = packet.trustedRenderMode && Boolean(macro.trustJustification);
    const passed = used.length === 0 || trusted;
    addCheck(
      "MACRO_TRUST_COMMANDS",
      passed,
      `${macro.name}; commands=${used.join(",") || "none"}`,
    );
    if (used.length > 0) {
      addIssue(
        trusted ? "warning" : "error",
        trusted ? "TRUSTED_MACRO_REVIEW_REQUIRED" : "UNSAFE_MACRO_COMMAND",
        "Macro body uses a command that can escape plain equation rendering.",
        REQUIREMENT_MAP.scientific_formatting,
        trusted
          ? "Keep the trusted-render justification with reviewer signoff."
          : "Remove the unsafe command or move it behind an approved trusted-render packet.",
        macro.name,
      );
    }

    if (!macro.approved) {
      addIssue(
        "error",
        "UNAPPROVED_MACRO_EDIT",
        "Macro edit has not been approved for the shared named version.",
        REQUIREMENT_MAP.version_history,
        "Require approval before autosave promotes this macro into the named version.",
        macro.name,
      );
    }
  }
}

function checkMacroRecursion(packet, policy, addCheck, addIssue) {
  const macroMap = new Map(packet.macros.map((macro) => [macro.name, macro]));
  for (const macro of packet.macros) {
    const cycle = findMacroCycle(macro, macroMap, policy.maxExpansionDepth);
    const passed = cycle.length === 0;
    addCheck("MACRO_RECURSION", passed, `${macro.name}; cycle=${cycle.join(" -> ") || "none"}`);
    if (!passed) {
      addIssue(
        "error",
        "RECURSIVE_MACRO_EXPANSION",
        "Macro expansion forms a recursive cycle.",
        REQUIREMENT_MAP.scientific_formatting,
        "Break the macro cycle before live preview or export rendering.",
        macro.name,
      );
    }
  }
}

function checkBlockContent(packet, policy, addCheck, addIssue) {
  for (const block of packet.blocks) {
    const rawHtml = policy.rawHtmlPattern.test(block.text);
    addCheck("RAW_HTML_BLOCK", !rawHtml, `${block.blockId}; rawHtml=${rawHtml}`);
    if (rawHtml) {
      addIssue(
        "error",
        "RAW_HTML_IN_COLLAB_BLOCK",
        "Collaborative block contains raw active HTML.",
        REQUIREMENT_MAP.scientific_formatting,
        "Strip active HTML before live preview or named-version export.",
        block.blockId,
      );
    }

    const externalHosts = findExternalHosts(block.text, policy);
    const disallowed = externalHosts.filter(
      (host) => !policy.allowedExternalHosts.includes(host),
    );
    addCheck(
      "EXTERNAL_RENDER_RESOURCE",
      disallowed.length === 0,
      `${block.blockId}; hosts=${externalHosts.join(",") || "none"}`,
    );
    if (disallowed.length > 0) {
      addIssue(
        "error",
        "EXTERNAL_RENDER_RESOURCE_BLOCKED",
        "Collaborative render block references an unapproved external resource.",
        REQUIREMENT_MAP.scientific_formatting,
        "Replace external resources with repository-managed figure or citation assets.",
        block.blockId,
      );
    }
  }
}

function checkLockedSection(packet, addCheck, addIssue) {
  const lockedBlocks = packet.blocks.filter((block) => block.locked);
  const hasRenderRisk = packet.macros.some(
    (macro) => !macro.approved || macro.body.includes("\\href"),
  );
  const passed = lockedBlocks.length === 0 || !hasRenderRisk;
  addCheck(
    "LOCKED_SECTION_RENDER_HOLD",
    passed,
    `lockedBlocks=${lockedBlocks.length}; renderRisk=${hasRenderRisk}`,
  );
  if (!passed) {
    addIssue(
      "error",
      "LOCKED_SECTION_RENDER_HOLD",
      "Locked section contains unapproved or external-resource macro changes.",
      REQUIREMENT_MAP.locking,
      "Hold render/export until the section owner approves the macro packet.",
      packet.sectionId,
    );
  }
}

function buildRenderDecision(status, issues) {
  const blocking = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  return {
    allowLivePreview: blocking.length === 0,
    allowNamedVersionExport: blocking.length === 0,
    allowTrustedKatexRender: blocking.length === 0 && warnings.length === 0,
    requiresReviewerSignoff: warnings.length > 0,
    remediationChecklist: issues.map((issue) => ({
      code: issue.code,
      target: issue.target,
      action: issue.remediation,
    })),
    status,
  };
}

function groupMacros(macros) {
  const groups = new Map();
  for (const macro of macros) {
    if (!groups.has(macro.name)) {
      groups.set(macro.name, []);
    }
    groups.get(macro.name).push(macro);
  }
  return groups;
}

function findMacroCycle(startMacro, macroMap, maxDepth) {
  const visited = [];
  let current = startMacro;
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    visited.push(current.name);
    const nextName = [...macroMap.keys()].find((name) =>
      current.body.includes(name),
    );
    if (!nextName) {
      return [];
    }
    if (visited.includes(nextName)) {
      return [...visited, nextName];
    }
    current = macroMap.get(nextName);
  }
  return visited;
}

function findExternalHosts(text, policy) {
  const hosts = [];
  let match = policy.externalUrlPattern.exec(text);
  while (match) {
    hosts.push(match[1].toLowerCase());
    match = policy.externalUrlPattern.exec(text);
  }
  policy.externalUrlPattern.lastIndex = 0;
  return [...new Set(hosts)].sort();
}

function assertPacket(packet) {
  if (!packet || typeof packet !== "object") {
    throw new TypeError("packet must be an object");
  }
  for (const field of ["packetId", "documentId", "namedVersion", "sectionId"]) {
    if (!packet[field]) {
      throw new TypeError(`packet.${field} is required`);
    }
  }
  if (!Array.isArray(packet.macros)) {
    throw new TypeError("packet.macros must be an array");
  }
  if (!Array.isArray(packet.blocks)) {
    throw new TypeError("packet.blocks must be an array");
  }
}

function compareIssues(a, b) {
  return (
    severityRank(a.severity) - severityRank(b.severity) ||
    a.code.localeCompare(b.code) ||
    a.target.localeCompare(b.target)
  );
}

function severityRank(severity) {
  return severity === "error" ? 0 : 1;
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
  REQUIREMENT_MAP,
  createGuardReport,
  evaluateMacroPacket,
  renderMarkdown,
  renderSvg,
};
