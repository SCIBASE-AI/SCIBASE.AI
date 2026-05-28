const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { auditHotkeyScope, writeAuditReports } = require("./index");
const { samplePacket } = require("./sample-data");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeReadyPacket() {
  const packet = clone(samplePacket);
  packet.bindings = [
    {
      id: "bind-command-palette",
      keys: "Meta+Shift+P",
      commandId: "cmd-open-command-palette",
      scope: "editor-surface",
      requiresFocus: true,
      allowedModes: ["markdown", "latex", "wysiwyg", "notebook"],
    },
    {
      id: "bind-run-cell",
      keys: "Shift+Enter",
      commandId: "cmd-run-notebook-cell",
      scope: "editor-surface",
      requiresFocus: true,
      allowedModes: ["notebook"],
    },
    {
      id: "bind-format-block",
      keys: "Meta+Shift+B",
      commandId: "cmd-format-block",
      scope: "editor-surface",
      requiresFocus: true,
      allowedModes: ["markdown", "wysiwyg"],
    },
  ];
  packet.commands = packet.commands.map((command) =>
    command.id === "cmd-format-block" ? { ...command, allowedModes: ["markdown", "wysiwyg"] } : command,
  );
  packet.scenarios = [
    {
      id: "safe-markdown-format",
      bindingId: "bind-format-block",
      surface: "markdown-block",
      sectionId: "open-methods",
      sectionLocked: false,
      actorRole: "coauthor",
      permissionAllowed: true,
      auditEventCreated: true,
    },
    {
      id: "safe-notebook-execute",
      bindingId: "bind-run-cell",
      surface: "notebook-cell",
      sectionId: "analysis-cell-7",
      sectionLocked: false,
      actorRole: "coauthor",
      permissionAllowed: true,
      auditEventCreated: true,
    },
  ];
  return packet;
}

function codes(report) {
  return new Set(report.findings.map((finding) => finding.code));
}

const report = auditHotkeyScope(samplePacket);
const findingCodes = codes(report);
assert.strictEqual(report.decision, "hold-hotkey-map");
assert.strictEqual(report.riskScore, 100);
assert(findingCodes.has("GLOBAL_BROWSER_COLLISION"));
assert(findingCodes.has("APP_NAVIGATION_COLLISION"));
assert(findingCodes.has("NOTEBOOK_EXECUTION_COLLISION"));
assert(findingCodes.has("LOCKED_SECTION_MUTATION"));
assert(findingCodes.has("ANONYMOUS_REVIEWER_LEAK"));
assert(findingCodes.has("MODE_UNSCOPED_FORMATTING"));
assert(findingCodes.has("ASSISTIVE_TECH_COLLISION"));
assert(findingCodes.has("MISSING_FOCUS_GUARD"));
assert(findingCodes.has("UNANNOUNCED_REMOTE_ACTION"));
assert(findingCodes.has("PRIVILEGE_BYPASS"));

const repeatedReport = auditHotkeyScope(samplePacket);
assert.strictEqual(report.evidenceDigest, repeatedReport.evidenceDigest, "audit digest should be deterministic");

const readyReport = auditHotkeyScope(makeReadyPacket());
assert.strictEqual(readyReport.decision, "release-hotkey-map");
assert.strictEqual(readyReport.findingCount, 0);
assert.strictEqual(readyReport.riskScore, 0);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hotkey-scope-guard-"));
const paths = writeAuditReports(report, tempDir);
for (const outputPath of Object.values(paths)) {
  assert(fs.existsSync(outputPath), `expected report at ${outputPath}`);
}
assert(fs.readFileSync(paths.markdownPath, "utf8").includes("Hotkey Scope Guard"));

console.log("hotkey-scope-guard tests passed");
