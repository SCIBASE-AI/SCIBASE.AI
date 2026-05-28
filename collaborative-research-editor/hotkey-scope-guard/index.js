const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const RULES = {
  GLOBAL_BROWSER_COLLISION: {
    severity: "high",
    penalty: 16,
    recommendation: "Move the shortcut behind an editor-local chord or remove the browser-reserved binding.",
  },
  APP_NAVIGATION_COLLISION: {
    severity: "high",
    penalty: 14,
    recommendation: "Scope the binding to the active editor surface so workspace navigation is not hijacked.",
  },
  NOTEBOOK_EXECUTION_COLLISION: {
    severity: "high",
    penalty: 16,
    recommendation: "Separate notebook execution bindings from manuscript editing and require notebook focus.",
  },
  LOCKED_SECTION_MUTATION: {
    severity: "high",
    penalty: 18,
    recommendation: "Block mutation shortcuts inside locked/final-review sections and offer comment-only actions.",
  },
  ANONYMOUS_REVIEWER_LEAK: {
    severity: "high",
    penalty: 15,
    recommendation: "Prevent shortcut-triggered labels, mentions, or presence pings from exposing anonymous reviewers.",
  },
  MODE_UNSCOPED_FORMATTING: {
    severity: "medium",
    penalty: 9,
    recommendation: "Require explicit Markdown, LaTeX, WYSIWYG, or notebook mode scoping for formatting commands.",
  },
  ASSISTIVE_TECH_COLLISION: {
    severity: "medium",
    penalty: 10,
    recommendation: "Remap shortcuts that conflict with screen-reader or OS accessibility navigation.",
  },
  MISSING_FOCUS_GUARD: {
    severity: "medium",
    penalty: 8,
    recommendation: "Check active focus target before executing any collaborative editor shortcut.",
  },
  UNANNOUNCED_REMOTE_ACTION: {
    severity: "medium",
    penalty: 7,
    recommendation: "Generate a visible audit event before a shortcut mutates shared document state.",
  },
  PRIVILEGE_BYPASS: {
    severity: "high",
    penalty: 17,
    recommendation: "Run shortcut commands through the same permission gate as toolbar and menu actions.",
  },
};

const BROWSER_RESERVED = new Set(["Meta+R", "Ctrl+R", "Meta+L", "Ctrl+L", "Meta+W", "Ctrl+W", "Meta+T", "Ctrl+T"]);
const APP_RESERVED = new Set(["g c", "g p", "g s", "Meta+K", "Ctrl+K"]);
const ASSISTIVE_RESERVED = new Set(["Ctrl+Alt+ArrowDown", "Ctrl+Alt+ArrowUp", "VO+Space", "Insert+F7"]);
const MUTATION_COMMANDS = new Set(["replace-selection", "accept-suggestion", "run-notebook-cell", "toggle-latex-macro", "format-block"]);

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value, length = 16) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, length);
}

function addFinding(findings, code, message, evidence) {
  const rule = RULES[code];
  findings.push({
    code,
    severity: rule.severity,
    penalty: rule.penalty,
    message,
    evidence,
    recommendation: rule.recommendation,
  });
}

function isMutation(command) {
  return MUTATION_COMMANDS.has(command.action) || command.mutatesDocument === true || command.mutatesSharedState === true;
}

function auditBindings(packet, findings) {
  for (const binding of packet.bindings || []) {
    const command = (packet.commands || []).find((item) => item.id === binding.commandId) || {};

    if (BROWSER_RESERVED.has(binding.keys) && binding.scope === "global") {
      addFinding(findings, "GLOBAL_BROWSER_COLLISION", `Binding ${binding.id} collides with a browser-reserved shortcut.`, {
        bindingId: binding.id,
        keys: binding.keys,
        commandId: binding.commandId,
        scope: binding.scope,
      });
    }

    if (APP_RESERVED.has(binding.keys) && binding.scope !== "editor-surface") {
      addFinding(findings, "APP_NAVIGATION_COLLISION", `Binding ${binding.id} can hijack workspace navigation outside the editor.`, {
        bindingId: binding.id,
        keys: binding.keys,
        scope: binding.scope,
        expectedScope: "editor-surface",
      });
    }

    if (ASSISTIVE_RESERVED.has(binding.keys)) {
      addFinding(findings, "ASSISTIVE_TECH_COLLISION", `Binding ${binding.id} conflicts with accessibility navigation.`, {
        bindingId: binding.id,
        keys: binding.keys,
        assistiveTechnology: binding.assistiveTechnology || "screen-reader/OS navigation",
      });
    }

    if (binding.requiresFocus !== true) {
      addFinding(findings, "MISSING_FOCUS_GUARD", `Binding ${binding.id} does not require editor focus before execution.`, {
        bindingId: binding.id,
        keys: binding.keys,
        commandId: binding.commandId,
      });
    }

    const commandModes = new Set(command.allowedModes || []);
    const bindingModes = new Set(binding.allowedModes || []);
    if (isMutation(command) && commandModes.size === 0 && bindingModes.size === 0) {
      addFinding(findings, "MODE_UNSCOPED_FORMATTING", `Binding ${binding.id} mutates content without mode-specific scoping.`, {
        bindingId: binding.id,
        commandId: binding.commandId,
        action: command.action,
      });
    }
  }
}

function auditScenarios(packet, findings) {
  for (const scenario of packet.scenarios || []) {
    const binding = (packet.bindings || []).find((item) => item.id === scenario.bindingId) || {};
    const command = (packet.commands || []).find((item) => item.id === binding.commandId) || {};

    if (scenario.surface === "notebook-cell" && command.action === "format-block") {
      addFinding(findings, "NOTEBOOK_EXECUTION_COLLISION", `Scenario ${scenario.id} routes a manuscript formatting shortcut inside a notebook cell.`, {
        scenarioId: scenario.id,
        bindingId: binding.id,
        keys: binding.keys,
        commandId: command.id,
        surface: scenario.surface,
      });
    }

    if (scenario.surface !== "notebook-cell" && command.action === "run-notebook-cell") {
      addFinding(findings, "NOTEBOOK_EXECUTION_COLLISION", `Scenario ${scenario.id} can execute notebook code from a non-notebook surface.`, {
        scenarioId: scenario.id,
        bindingId: binding.id,
        keys: binding.keys,
        surface: scenario.surface,
      });
    }

    if (scenario.sectionLocked && isMutation(command)) {
      addFinding(findings, "LOCKED_SECTION_MUTATION", `Scenario ${scenario.id} can mutate a locked section through a shortcut.`, {
        scenarioId: scenario.id,
        bindingId: binding.id,
        commandId: command.id,
        sectionId: scenario.sectionId,
        lockOwner: scenario.lockOwner,
      });
    }

    if (scenario.actorRole === "anonymous-reviewer" && (command.revealsActor || scenario.broadcastsPresence)) {
      addFinding(findings, "ANONYMOUS_REVIEWER_LEAK", `Scenario ${scenario.id} can reveal an anonymous reviewer through shortcut side effects.`, {
        scenarioId: scenario.id,
        bindingId: binding.id,
        commandId: command.id,
        broadcastsPresence: Boolean(scenario.broadcastsPresence),
        revealsActor: Boolean(command.revealsActor),
      });
    }

    if (scenario.permissionAllowed === false && isMutation(command)) {
      addFinding(findings, "PRIVILEGE_BYPASS", `Scenario ${scenario.id} bypasses the expected permission denial path.`, {
        scenarioId: scenario.id,
        bindingId: binding.id,
        commandId: command.id,
        actorRole: scenario.actorRole,
      });
    }

    if (command.mutatesSharedState && scenario.auditEventCreated !== true) {
      addFinding(findings, "UNANNOUNCED_REMOTE_ACTION", `Scenario ${scenario.id} mutates shared state without an audit event.`, {
        scenarioId: scenario.id,
        bindingId: binding.id,
        commandId: command.id,
      });
    }
  }
}

function summarize(findings) {
  const severityCounts = { high: 0, medium: 0, low: 0 };
  for (const finding of findings) severityCounts[finding.severity] += 1;
  const riskScore = Math.min(100, findings.reduce((sum, finding) => sum + finding.penalty, 0));
  let decision = "release-hotkey-map";
  if (severityCounts.high > 0 || riskScore >= 50) decision = "hold-hotkey-map";
  else if (severityCounts.medium > 0) decision = "needs-accessibility-review";
  return { severityCounts, riskScore, decision };
}

function auditHotkeyScope(packet, options = {}) {
  if (!packet || typeof packet !== "object") throw new TypeError("packet must be an object");
  const normalized = {
    documentId: packet.documentId,
    title: packet.title,
    commands: packet.commands || [],
    bindings: packet.bindings || [],
    scenarios: packet.scenarios || [],
  };
  const findings = [];

  auditBindings(normalized, findings);
  auditScenarios(normalized, findings);

  const summary = summarize(findings);
  const evidenceDigest = digest({
    documentId: normalized.documentId,
    commands: normalized.commands,
    bindings: normalized.bindings,
    scenarios: normalized.scenarios,
    findings,
  });

  return {
    documentId: normalized.documentId,
    title: normalized.title,
    generatedAt: options.now || "2026-05-28T21:35:00.000Z",
    decision: summary.decision,
    riskScore: summary.riskScore,
    severityCounts: summary.severityCounts,
    findingCount: findings.length,
    evidenceDigest,
    summary: {
      commands: normalized.commands.length,
      bindings: normalized.bindings.length,
      scenarios: normalized.scenarios.length,
    },
    findings,
  };
}

function createMarkdownReport(report) {
  const findings = report.findings.length
    ? report.findings
        .map(
          (finding, index) => [
            `### ${index + 1}. ${finding.code} (${finding.severity})`,
            finding.message,
            "",
            `Recommendation: ${finding.recommendation}`,
            "",
            "Evidence:",
            "```json",
            JSON.stringify(finding.evidence, null, 2),
            "```",
          ].join("\n"),
        )
        .join("\n\n")
    : "No blocking findings.";

  return [
    "# Hotkey Scope Guard",
    "",
    `Document: ${report.title || report.documentId}`,
    `Decision: ${report.decision}`,
    `Risk score: ${report.riskScore}/100`,
    `Evidence digest: ${report.evidenceDigest}`,
    "",
    "## Scope",
    "",
    `Commands: ${report.summary.commands}`,
    `Bindings: ${report.summary.bindings}`,
    `Scenarios: ${report.summary.scenarios}`,
    "",
    "## Findings",
    "",
    findings,
    "",
  ].join("\n");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createSummarySvg(report) {
  const riskWidth = Math.max(0, Math.min(1, report.riskScore / 100)) * 560;
  const color = report.decision === "release-hotkey-map" ? "#168a4a" : report.decision === "needs-accessibility-review" ? "#b7791f" : "#b91c1c";
  const rows = report.findings
    .slice(0, 5)
    .map(
      (finding, index) =>
        `<text x="72" y="${342 + index * 36}" fill="#334155" font-family="Arial, sans-serif" font-size="20">${escapeXml(
          finding.code,
        )}: ${escapeXml(finding.message).slice(0, 92)}</text>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="48" y="44" width="1184" height="632" rx="18" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="72" y="98" fill="#0f172a" font-family="Arial, sans-serif" font-size="34" font-weight="700">Collaborative Hotkey Scope Guard</text>
  <text x="72" y="140" fill="#475569" font-family="Arial, sans-serif" font-size="22">${escapeXml(report.title || report.documentId)}</text>
  <text x="72" y="198" fill="${color}" font-family="Arial, sans-serif" font-size="32" font-weight="700">${escapeXml(report.decision)}</text>
  <text x="72" y="242" fill="#334155" font-family="Arial, sans-serif" font-size="22">Risk ${report.riskScore}/100 · findings ${
    report.findingCount
  } · digest ${escapeXml(report.evidenceDigest)}</text>
  <rect x="72" y="270" width="560" height="24" rx="12" fill="#e2e8f0"/>
  <rect x="72" y="270" width="${riskWidth}" height="24" rx="12" fill="${color}"/>
  <text x="72" y="324" fill="#0f172a" font-family="Arial, sans-serif" font-size="24" font-weight="700">Top findings</text>
  ${rows}
  <text x="72" y="642" fill="#64748b" font-family="Arial, sans-serif" font-size="18">Synthetic collaboration packet only. No live users, private manuscripts, or external services.</text>
</svg>
`;
}

function writeAuditReports(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "hotkey-scope-audit.json");
  const markdownPath = path.join(outputDir, "hotkey-scope-audit.md");
  const svgPath = path.join(outputDir, "hotkey-scope-summary.svg");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, createMarkdownReport(report));
  fs.writeFileSync(svgPath, createSummarySvg(report));
  return { jsonPath, markdownPath, svgPath };
}

module.exports = {
  RULES,
  auditHotkeyScope,
  createMarkdownReport,
  createSummarySvg,
  digest,
  stableStringify,
  writeAuditReports,
};
