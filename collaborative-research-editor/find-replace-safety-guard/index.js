const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 30,
  high: 18,
  medium: 9,
  low: 4,
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMatcher(operation) {
  const flags = operation.caseSensitive ? "g" : "gi";
  const source = operation.wholeWord ? `\\b${escapeRegExp(operation.find)}\\b` : escapeRegExp(operation.find);
  return new RegExp(source, flags);
}

function blockText(block) {
  return [block.content, block.key, block.anchor, block.caption].filter(Boolean).join("\n");
}

function countMatches(text, matcher) {
  const matches = String(text).match(matcher);
  return matches ? matches.length : 0;
}

function classifyBlockRisk(block, section, operation, matcher) {
  const findings = [];
  const text = blockText(block);
  const matches = countMatches(text, matcher);
  if (!matches) {
    return findings;
  }

  const identity = `${section.id}/${block.id}`;
  if (section.locked || section.freeze === "final-review") {
    findings.push({
      severity: "blocker",
      code: "LOCKED_SECTION_MATCH",
      title: "Batch replacement touches a locked or final-review section",
      evidence: `${identity} has ${matches} match(es) while section state is ${section.locked ? "locked" : section.freeze}.`,
      action: "Exclude the section, unlock with an audit reason, or convert matches to explicit suggestions.",
    });
  }

  if (block.type === "citation" || /@[A-Za-z0-9:_-]+/.test(text)) {
    findings.push({
      severity: "high",
      code: "CITATION_KEY_MUTATION",
      title: "Replacement would alter citation keys or reference anchors",
      evidence: `${identity} contains citation/reference text matching "${operation.find}".`,
      action: "Route citation-key changes through the reference manager merge workflow instead of direct replacement.",
    });
  }

  if (block.type === "latex" && /\\[A-Za-z]+/.test(text)) {
    findings.push({
      severity: "high",
      code: "LATEX_COMMAND_MUTATION",
      title: "Replacement would alter LaTeX command or equation source",
      evidence: `${identity} is a LaTeX block with ${matches} match(es).`,
      action: "Preview equation output and require formula-owner approval before applying source-mode replacements.",
    });
  }

  if (block.type === "code" || block.type === "notebook") {
    findings.push({
      severity: "high",
      code: "CODE_CELL_MUTATION",
      title: "Replacement would mutate notebook or code cell source",
      evidence: `${identity} is ${block.type} source with ${matches} match(es).`,
      action: "Create a code-review task and rerun the notebook before sharing updated outputs.",
    });
  }

  if (block.type === "cross-reference" || /fig:|tbl:|eq:/i.test(text)) {
    findings.push({
      severity: "medium",
      code: "CROSS_REFERENCE_TOUCH",
      title: "Replacement touches cross-reference anchors",
      evidence: `${identity} contains figure, table, or equation anchors.`,
      action: "Regenerate cross-reference maps and hold export until anchors resolve.",
    });
  }

  return findings;
}

function replacementPreview(document, operation) {
  const matcher = buildMatcher(operation);
  const scope = new Set(operation.scopeSections || []);
  const changedBlocks = [];
  const findings = [];

  document.sections.forEach((section) => {
    if (scope.size && !scope.has(section.id)) {
      return;
    }
    section.blocks.forEach((block) => {
      const text = blockText(block);
      const matches = countMatches(text, matcher);
      if (!matches) {
        return;
      }
      const before = text;
      const after = text.replace(matcher, operation.replace);
      changedBlocks.push({
        sectionId: section.id,
        blockId: block.id,
        type: block.type,
        matches,
        beforeDigest: digest(before),
        afterDigest: digest(after),
      });
      findings.push(...classifyBlockRisk(block, section, operation, matcher));
    });
  });

  (document.comments || []).forEach((comment) => {
    const changed = changedBlocks.some((block) => block.blockId === comment.blockId);
    if (changed && comment.quote && countMatches(comment.quote, matcher)) {
      findings.push({
        severity: "medium",
        code: "COMMENT_ANCHOR_DRIFT",
        title: "Replacement would invalidate an inline comment quote anchor",
        evidence: `Comment ${comment.id} anchors to text that would be replaced in block ${comment.blockId}.`,
        action: "Convert the edit to a suggestion and re-anchor or resolve the comment before applying.",
      });
    }
  });

  if (operation.mode === "wysiwyg" && findings.some((finding) => /LATEX|CODE|CITATION/.test(finding.code))) {
    findings.push({
      severity: "medium",
      code: "WYSIWYG_SCOPE_MISMATCH",
      title: "WYSIWYG replacement crosses source-only content",
      evidence: "The operation starts in WYSIWYG mode but reaches LaTeX, citation, or code source blocks.",
      action: "Split the operation by block type so source-mode changes receive explicit review.",
    });
  }

  const riskScore = Math.min(100, findings.reduce((sum, finding) => sum + SEVERITY_WEIGHT[finding.severity], 0));
  const blockers = findings.filter((finding) => finding.severity === "blocker").length;
  const high = findings.filter((finding) => finding.severity === "high").length;
  const decision = blockers || high ? "hold-batch-edit" : findings.length ? "suggestion-preview-required" : "safe-to-apply";
  const packet = {
    documentId: document.id,
    operation: {
      find: operation.find,
      replace: operation.replace,
      mode: operation.mode,
      wholeWord: Boolean(operation.wholeWord),
      scopeSections: operation.scopeSections || [],
    },
    decision,
    riskScore,
    changedBlocks,
    findings,
    actions: findings.map((finding) => ({ code: finding.code, action: finding.action })),
    generatedFrom: "synthetic-data-only",
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    `# Collaborative Find/Replace Safety Review`,
    "",
    `Decision: ${result.decision}`,
    `Risk score: ${result.riskScore}`,
    `Changed blocks: ${result.changedBlocks.length}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Findings",
  ];
  if (!result.findings.length) {
    lines.push("- No blocking find/replace risks.");
  } else {
    result.findings.forEach((finding) => {
      lines.push(`- [${finding.severity}] ${finding.title}: ${finding.evidence}`);
      lines.push(`  Action: ${finding.action}`);
    });
  }
  lines.push("", "## Safety", "- Synthetic document packet only; no live editor or private manuscript data.");
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
  const color = result.decision === "hold-batch-edit" ? "#b42318" : result.decision === "safe-to-apply" ? "#067647" : "#b54708";
  const rows = result.findings
    .slice(0, 5)
    .map((finding, index) => {
      const y = 215 + index * 54;
      return `<text x="56" y="${y}" fill="#111827" font-family="Arial" font-size="20">${escapeXml(finding.severity.toUpperCase())}: ${escapeXml(finding.title).slice(0, 72)}</text>
<text x="56" y="${y + 25}" fill="#667085" font-family="Arial" font-size="15">${escapeXml(finding.code)}</text>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#f7f8fa"/>
<rect x="36" y="36" width="1208" height="648" rx="18" fill="#ffffff" stroke="#d0d5dd"/>
<text x="56" y="88" fill="#101828" font-family="Arial" font-size="32" font-weight="700">Collaborative Find/Replace Safety Guard</text>
<text x="56" y="126" fill="#475467" font-family="Arial" font-size="20">Preview batch edits before shared manuscript mutation</text>
<rect x="56" y="150" width="310" height="44" rx="8" fill="${color}"/>
<text x="74" y="179" fill="#ffffff" font-family="Arial" font-size="20" font-weight="700">${escapeXml(result.decision.toUpperCase())}</text>
<text x="396" y="179" fill="#101828" font-family="Arial" font-size="22">Risk score: ${result.riskScore}</text>
${rows}
<text x="56" y="640" fill="#667085" font-family="Arial" font-size="18">Audit digest: ${escapeXml(result.auditDigest)} | Synthetic data only | No external services</text>
</svg>`;
}

module.exports = {
  replacementPreview,
  renderMarkdownReport,
  renderSvgSummary,
  stableStringify,
  digest,
};
