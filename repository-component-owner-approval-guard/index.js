const fs = require("fs");
const path = require("path");

function normalizePath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function matchComponent(filePath, policy) {
  const normalized = normalizePath(filePath);
  return Object.entries(policy).find(([, rule]) =>
    rule.paths.some((prefix) => {
      const normalizedPrefix = normalizePath(prefix);
      return normalized === normalizedPrefix || normalized.startsWith(normalizedPrefix);
    })
  );
}

function groupChangedComponents(files, policy) {
  const groups = new Map();

  for (const file of files) {
    const match = matchComponent(file.path, policy);
    const component = match ? match[0] : "unmapped";
    if (!groups.has(component)) {
      groups.set(component, []);
    }
    groups.get(component).push({
      ...file,
      path: normalizePath(file.path)
    });
  }

  return groups;
}

function approvalIsFresh(approval, changedAt) {
  return new Date(approval.approvedAt).getTime() >= new Date(changedAt).getTime();
}

function approvalsForComponent(approvals, component) {
  return approvals.filter((approval) => approval.components.includes(component));
}

function requiredRolesForComponent(component, files, policy) {
  const rule = policy[component];
  if (!rule) {
    return ["repository-curator"];
  }

  const roles = new Set(rule.owners);
  if (files.some((file) => file.restricted) && rule.restrictedOwners) {
    for (const owner of rule.restrictedOwners) {
      roles.add(owner);
    }
  }

  return [...roles];
}

function requiredEscalationRolesForComponent(component, files, policy) {
  const rule = policy[component];
  if (!rule || !rule.restrictedOwners) {
    return [];
  }

  if (!files.some((file) => file.restricted)) {
    return [];
  }

  return rule.restrictedOwners;
}

function evaluateComponent({ component, files, request, policy }) {
  const rule = policy[component] || { quorum: 1 };
  const requiredRoles = requiredRolesForComponent(component, files, policy);
  const requiredEscalationRoles = requiredEscalationRolesForComponent(component, files, policy);
  const scopedApprovals = approvalsForComponent(request.approvals, component);
  const freshApprovals = scopedApprovals.filter((approval) =>
    approvalIsFresh(approval, request.changedAt)
  );
  const eligibleApprovals = freshApprovals.filter((approval) =>
    requiredRoles.includes(approval.role) && !request.authors.includes(approval.user)
  );

  const findings = [];
  const approvedRoles = new Set(eligibleApprovals.map((approval) => approval.role));
  const missingEscalationRoles = requiredEscalationRoles.filter((role) => !approvedRoles.has(role));
  const staleApprovals = scopedApprovals.filter(
    (approval) => !approvalIsFresh(approval, request.changedAt)
  );
  const selfApprovals = scopedApprovals.filter((approval) =>
    request.authors.includes(approval.user)
  );
  const outOfScopeApprovals = scopedApprovals.filter(
    (approval) => !requiredRoles.includes(approval.role)
  );

  if (component === "unmapped") {
    findings.push({
      severity: "critical",
      code: "unmapped-component-change",
      message: "Changed files do not map to an owned repository component.",
      files: files.map((file) => file.path)
    });
  }

  if (eligibleApprovals.length < rule.quorum) {
    findings.push({
      severity: "critical",
      code: "approval-quorum-missing",
      message: `${component} requires ${rule.quorum} eligible owner approval(s).`,
      requiredRoles,
      eligibleRoles: [...approvedRoles]
    });
  }

  if (missingEscalationRoles.length > 0) {
    findings.push({
      severity: "critical",
      code: "required-owner-role-missing",
      message: `${component} is missing restricted-change escalation owner approval(s).`,
      missingRoles: missingEscalationRoles
    });
  }

  if (staleApprovals.length > 0) {
    findings.push({
      severity: "critical",
      code: "stale-approval-after-change",
      message: `${component} has approval(s) older than the latest changed file timestamp.`,
      approvals: staleApprovals.map((approval) => ({
        user: approval.user,
        role: approval.role,
        approvedAt: approval.approvedAt
      }))
    });
  }

  if (selfApprovals.length > 0) {
    findings.push({
      severity: "critical",
      code: "conflicted-self-approval",
      message: `${component} includes approval from a merge request author.`,
      approvals: selfApprovals.map((approval) => ({
        user: approval.user,
        role: approval.role
      }))
    });
  }

  if (outOfScopeApprovals.length > 0) {
    findings.push({
      severity: "warning",
      code: "owner-role-out-of-scope",
      message: `${component} includes approval role(s) that do not satisfy this component policy.`,
      approvals: outOfScopeApprovals.map((approval) => ({
        user: approval.user,
        role: approval.role
      }))
    });
  }

  return {
    component,
    files: files.map((file) => file.path),
    restricted: files.some((file) => file.restricted),
    requiredRoles,
    eligibleApprovals: eligibleApprovals.map((approval) => ({
      user: approval.user,
      role: approval.role,
      approvedAt: approval.approvedAt
    })),
    findings
  };
}

function decisionForFindings(findings) {
  if (findings.some((finding) => finding.severity === "critical")) {
    return "block-merge";
  }
  if (findings.some((finding) => finding.severity === "warning")) {
    return "require-owner-review";
  }
  return "approve-merge";
}

function scoreFindings(findings) {
  const penalties = findings.reduce((total, finding) => {
    if (finding.severity === "critical") {
      return total + 30;
    }
    if (finding.severity === "warning") {
      return total + 12;
    }
    return total + 4;
  }, 0);
  return Math.max(0, 100 - penalties);
}

function evaluateMergeRequest(request, policy) {
  const groups = groupChangedComponents(request.files, policy);
  const components = [...groups.entries()].map(([component, files]) =>
    evaluateComponent({ component, files, request, policy })
  );
  const findings = components.flatMap((component) => component.findings);

  return {
    id: request.id,
    title: request.title,
    authors: request.authors,
    changedAt: request.changedAt,
    touchedComponents: components.map((component) => component.component),
    decision: decisionForFindings(findings),
    score: scoreFindings(findings),
    components,
    findings
  };
}

function summarizeEvaluations(evaluations) {
  const decisions = evaluations.reduce((summary, evaluation) => {
    summary[evaluation.decision] = (summary[evaluation.decision] || 0) + 1;
    return summary;
  }, {});

  const findingCounts = evaluations
    .flatMap((evaluation) => evaluation.findings)
    .reduce((counts, finding) => {
      counts[finding.code] = (counts[finding.code] || 0) + 1;
      return counts;
    }, {});

  return {
    totalMergeRequests: evaluations.length,
    decisions,
    findingCounts,
    blocked: evaluations
      .filter((evaluation) => evaluation.decision === "block-merge")
      .map((evaluation) => evaluation.id),
    approved: evaluations
      .filter((evaluation) => evaluation.decision === "approve-merge")
      .map((evaluation) => evaluation.id)
  };
}

function evaluateRepositoryChanges({ mergeRequests, policy }) {
  const evaluations = mergeRequests.map((request) => evaluateMergeRequest(request, policy));
  return {
    generatedAt: new Date("2026-05-22T19:30:00Z").toISOString(),
    guard: "repository-component-owner-approval-guard",
    summary: summarizeEvaluations(evaluations),
    evaluations
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Repository Component Owner Approval Guard",
    "",
    `Generated: ${result.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Total merge requests: ${result.summary.totalMergeRequests}`,
    `- Approved: ${result.summary.decisions["approve-merge"] || 0}`,
    `- Require owner review: ${result.summary.decisions["require-owner-review"] || 0}`,
    `- Blocked: ${result.summary.decisions["block-merge"] || 0}`,
    "",
    "## Merge Request Decisions",
    ""
  ];

  for (const evaluation of result.evaluations) {
    lines.push(`### ${evaluation.id}: ${evaluation.title}`);
    lines.push("");
    lines.push(`- Decision: ${evaluation.decision}`);
    lines.push(`- Score: ${evaluation.score}`);
    lines.push(`- Components: ${evaluation.touchedComponents.join(", ")}`);

    if (evaluation.findings.length === 0) {
      lines.push("- Findings: none");
    } else {
      lines.push("- Findings:");
      for (const finding of evaluation.findings) {
        lines.push(`  - ${finding.severity}: ${finding.code} - ${finding.message}`);
      }
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderSvgSummary(result) {
  const approved = result.summary.decisions["approve-merge"] || 0;
  const review = result.summary.decisions["require-owner-review"] || 0;
  const blocked = result.summary.decisions["block-merge"] || 0;

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="420" viewBox="0 0 960 420">',
    '<rect width="960" height="420" fill="#f6f7f9"/>',
    '<rect x="40" y="40" width="880" height="340" rx="8" fill="#ffffff" stroke="#d7dce2"/>',
    '<text x="70" y="92" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#182026">Repository Component Owner Approval Guard</text>',
    '<text x="70" y="128" font-family="Arial, sans-serif" font-size="16" fill="#52606d">Protected-branch owner quorum check for scientific repository changes</text>',
    metricBlock(70, 175, "Approved", approved, "#1f7a4d"),
    metricBlock(350, 175, "Needs Review", review, "#a15c00"),
    metricBlock(630, 175, "Blocked", blocked, "#b42318"),
    '<text x="70" y="330" font-family="Arial, sans-serif" font-size="17" fill="#2f3a45">Findings: stale approvals, conflicted self-approvals, missing restricted-data owners, and unmapped component changes.</text>',
    "</svg>"
  ].join("");
}

function metricBlock(x, y, label, value, color) {
  return [
    `<rect x="${x}" y="${y}" width="230" height="100" rx="8" fill="${color}" opacity="0.12"/>`,
    `<text x="${x + 24}" y="${y + 40}" font-family="Arial, sans-serif" font-size="18" fill="#24313d">${label}</text>`,
    `<text x="${x + 24}" y="${y + 78}" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${color}">${value}</text>`
  ].join("");
}

function writeReports(result, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "reviewer-packet.md"), renderMarkdownReport(result));
  fs.writeFileSync(path.join(outputDir, "summary.svg"), renderSvgSummary(result));
}

module.exports = {
  evaluateMergeRequest,
  evaluateRepositoryChanges,
  groupChangedComponents,
  matchComponent,
  normalizePath,
  renderMarkdownReport,
  renderSvgSummary,
  requiredRolesForComponent,
  writeReports
};
