const NETWORK_PATTERNS = [/\bhttps?:\/\//i, /\bcurl\b/i, /\bwget\b/i, /\brequests\./i, /\bsocket\b/i, /\bnc\b/i];
const SECRET_KEY_PATTERN = /(token|secret|password|api[_-]?key|private[_-]?key|access[_-]?key)/i;
const LIFECYCLE_SCRIPTS = new Set(["preinstall", "install", "postinstall", "prepare"]);

function hasPathEscape(filePath) {
  return (
    typeof filePath !== "string" ||
    filePath.startsWith("/") ||
    filePath.split(/[\\/]+/).some((part) => part === "..")
  );
}

function hasNetworkCall(source) {
  return NETWORK_PATTERNS.some((pattern) => pattern.test(source || ""));
}

function addIssue(issues, severity, code, message, context) {
  issues.push({ severity, code, message, context });
}

function reviewFiles(submission, issues, actions) {
  for (const file of submission.files || []) {
    if (hasPathEscape(file.path)) {
      addIssue(issues, "critical", "path-escape", "File path can escape the reviewer workspace.", file.path);
      actions.push(`Quarantine ${file.path} and require a normalized manifest path.`);
    }

    if (file.executable && !submission.reviewerSandbox.allowExecutables) {
      addIssue(issues, "critical", "undeclared-executable", "Executable artifact is not allowed by the reviewer sandbox.", file.path);
      actions.push(`Block executable artifact ${file.path} before sponsor or reviewer access.`);
    }

    if (file.hasMacros || /\.docm$/i.test(file.path || "")) {
      addIssue(issues, "high", "macro-enabled-document", "Macro-enabled document requires redaction or isolated review.", file.path);
      actions.push(`Convert or strip macros from ${file.path} before release.`);
    }
  }
}

function reviewNotebooks(submission, issues, actions) {
  for (const notebook of submission.notebooks || []) {
    for (const [index, cell] of (notebook.cells || []).entries()) {
      const context = `${notebook.path}:cell-${index + 1}`;
      if (cell.kind === "shell") {
        addIssue(issues, "critical", "shell-notebook-cell", "Notebook contains a shell cell in the review packet.", context);
        actions.push(`Disable shell execution in ${context}.`);
      }

      if (hasNetworkCall(cell.source) && !submission.reviewerSandbox.outboundNetwork) {
        addIssue(issues, "critical", "notebook-network-call", "Notebook attempts network access while sandbox network is disabled.", context);
        actions.push(`Run ${context} in a no-network sandbox or require offline fixture replacement.`);
      }

      if (/\/Users\/|C:\\\\|\/home\/|file:\/\//i.test(cell.source || "")) {
        addIssue(issues, "medium", "local-path-leak", "Notebook contains local filesystem paths that should be redacted.", context);
        actions.push(`Redact local path evidence from ${context}.`);
      }
    }
  }
}

function reviewDependencies(submission, issues, actions) {
  const scripts = (submission.dependencies && submission.dependencies.npmScripts) || {};
  for (const [name, command] of Object.entries(scripts)) {
    if (LIFECYCLE_SCRIPTS.has(name)) {
      const severity = hasNetworkCall(command) ? "critical" : "high";
      addIssue(issues, severity, "dependency-lifecycle-script", `Dependency lifecycle script ${name} must not run during reviewer install.`, name);
      actions.push(`Strip or sandbox npm ${name} before reviewer installation.`);
    }
  }
}

function reviewEnvironment(submission, issues, actions) {
  for (const [key, value] of Object.entries(submission.env || {})) {
    if (SECRET_KEY_PATTERN.test(key) && value) {
      addIssue(issues, "critical", "bundled-secret-like-env", "Secret-like environment value is bundled with the submission.", key);
      actions.push(`Remove ${key} from the review packet and rotate if it was real.`);
    }
  }
}

function reviewContainer(submission, issues, actions) {
  const container = submission.container || {};
  if (container.privileged && !submission.reviewerSandbox.containerPrivileged) {
    addIssue(issues, "critical", "privileged-container", "Container requests privileged execution.", container.image);
    actions.push("Reject privileged container mode for reviewer execution.");
  }

  if ((container.hostMounts || []).length > 0) {
    addIssue(issues, "critical", "host-mount-request", "Container requests host mounts.", container.hostMounts.join(", "));
    actions.push("Remove host mounts before sandbox review.");
  }

  if (container.network && container.network !== "none" && !submission.reviewerSandbox.outboundNetwork) {
    addIssue(issues, "high", "container-network-enabled", "Container network mode is not compatible with the reviewer sandbox.", container.network);
    actions.push("Force container network mode to none unless the sponsor grants a documented waiver.");
  }
}

function scoreFromIssues(issues) {
  const weights = { critical: 30, high: 15, medium: 6, low: 2 };
  const deduction = issues.reduce((sum, issue) => sum + (weights[issue.severity] || 4), 0);
  return Math.max(0, 100 - deduction);
}

function decisionFromIssues(issues) {
  const critical = issues.filter((issue) => issue.severity === "critical").length;
  const high = issues.filter((issue) => issue.severity === "high").length;
  if (critical >= 3) return "hold-sponsor-review";
  if (critical > 0) return "quarantine-submission";
  if (high > 0) return "sanitize-before-review";
  return "clear-for-review";
}

function reviewSubmission(submission) {
  const issues = [];
  const actions = [];

  reviewFiles(submission, issues, actions);
  reviewNotebooks(submission, issues, actions);
  reviewDependencies(submission, issues, actions);
  reviewEnvironment(submission, issues, actions);
  reviewContainer(submission, issues, actions);

  if (actions.length === 0) {
    actions.push("Release package to the reviewer sandbox with network disabled.");
  }

  return {
    submissionId: submission.id,
    challengeId: submission.challengeId,
    teamId: submission.teamId,
    decision: decisionFromIssues(issues),
    securityScore: scoreFromIssues(issues),
    issueCounts: issues.reduce((counts, issue) => {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
      return counts;
    }, {}),
    issues,
    actions: Array.from(new Set(actions)),
  };
}

function reviewSubmissions(submissions) {
  const results = submissions.map(reviewSubmission);
  const summary = {
    submissionCount: results.length,
    clearForReview: results.filter((result) => result.decision === "clear-for-review").length,
    sanitizeBeforeReview: results.filter((result) => result.decision === "sanitize-before-review").length,
    quarantined: results.filter((result) => result.decision === "quarantine-submission").length,
    heldForSponsorReview: results.filter((result) => result.decision === "hold-sponsor-review").length,
    averageSecurityScore: Math.round(results.reduce((sum, result) => sum + result.securityScore, 0) / results.length),
  };

  return {
    generatedAt: new Date("2026-05-28T00:00:00Z").toISOString(),
    requirementMap: [
      "Submission engine: screens solver packages before reviewer or sponsor access.",
      "Secure project space: prevents workspace escape, host mounts, and unsafe execution requests.",
      "Arbitration readiness: emits deterministic hold, quarantine, sanitize, or release actions.",
      "Audit logs: preserves reviewer-facing issue codes and remediation steps without executing submitted code.",
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
    "# Submission Security Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Submissions reviewed: ${report.summary.submissionCount}`,
    `- Clear for review: ${report.summary.clearForReview}`,
    `- Sanitize before review: ${report.summary.sanitizeBeforeReview}`,
    `- Quarantined: ${report.summary.quarantined}`,
    `- Held for sponsor review: ${report.summary.heldForSponsorReview}`,
    `- Average security score: ${report.summary.averageSecurityScore}`,
    "",
    "## Requirement Map",
    "",
    ...report.requirementMap.map((item) => `- ${item}`),
    "",
    "## Decisions",
    "",
  ];

  for (const result of report.results) {
    lines.push(`### ${result.submissionId}`);
    lines.push("");
    lines.push(`- Decision: ${result.decision}`);
    lines.push(`- Security score: ${result.securityScore}`);
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
  const rowHeight = 88;
  const height = 150 + report.results.length * rowHeight;
  const rows = report.results
    .map((result, index) => {
      const y = 112 + index * rowHeight;
      const color =
        result.decision === "clear-for-review"
          ? "#2f9e44"
          : result.decision === "sanitize-before-review"
            ? "#f08c00"
            : "#d6336c";
      const barWidth = Math.max(24, Math.round(result.securityScore * 5.2));
      return `
  <g transform="translate(40 ${y})">
    <text x="0" y="0" class="title">${escapeHtml(result.submissionId)}</text>
    <text x="0" y="25" class="meta">Decision: ${escapeHtml(result.decision)} | Issues: ${result.issues.length}</text>
    <rect x="430" y="-18" width="540" height="22" rx="4" fill="#e9ecef"/>
    <rect x="430" y="-18" width="${barWidth}" height="22" rx="4" fill="${color}"/>
    <text x="990" y="0" class="score">${result.securityScore}</text>
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
  <text x="40" y="54" class="heading">Scientific Bounty Submission Security Guard</text>
  <text x="40" y="84" class="sub">Screens solver packages before sponsor or reviewer access without executing submitted code.</text>
${rows}
</svg>
`;
}

module.exports = {
  reviewSubmission,
  reviewSubmissions,
  renderMarkdownReport,
  renderSvgReport,
  hasPathEscape,
  hasNetworkCall,
};
