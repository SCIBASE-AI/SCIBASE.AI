"use strict";

const crypto = require("crypto");

const SEVERITY_RANK = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function evaluateSubmissionLicenseRisk(challengePolicy, submission) {
  const blockers = [];
  const warnings = [];

  for (const artifact of submission.artifacts || []) {
    evaluateArtifact(challengePolicy, submission, artifact, blockers, warnings);
  }

  for (const dependency of submission.dependencies || []) {
    evaluateDependency(challengePolicy, dependency, blockers, warnings);
  }

  if (challengePolicy.requiresExportDisclosure) {
    evaluateExportDisclosure(submission, blockers, warnings);
  }

  const status = blockers.length > 0
    ? "block_sponsor_review"
    : warnings.length > 0
      ? "conditional_review"
      : "review_ready";

  const actions = buildActions(blockers, warnings);
  const summary = {
    blockers: blockers.length,
    warnings: warnings.length,
    artifactsReviewed: (submission.artifacts || []).length,
    dependenciesReviewed: (submission.dependencies || []).length,
  };

  const fingerprint = digest({
    challengeId: challengePolicy.id,
    submissionId: submission.id,
    blockers,
    warnings,
    status,
  });

  return {
    challengeId: challengePolicy.id,
    submissionId: submission.id,
    team: submission.team,
    status,
    summary,
    blockers,
    warnings,
    actions,
    fingerprint,
  };
}

function evaluateArtifact(policy, submission, artifact, blockers, warnings) {
  const allowedByType = allowedLicensesForType(policy, artifact.type);
  if (!artifact.license) {
    blockers.push(finding(
      "missing_license",
      artifact.id,
      "license-reviewer",
      "Artifact is missing a declared license.",
      `Add a license declaration for ${artifact.id} before sponsor review.`,
    ));
  } else if (allowedByType.length > 0 && !allowedByType.includes(artifact.license)) {
    blockers.push(finding(
      "license_incompatible",
      artifact.id,
      "license-reviewer",
      `${artifact.type} license ${artifact.license} is outside the challenge allowlist.`,
      `Replace ${artifact.id}, obtain sponsor exception approval, or remove it from the review package.`,
    ));
  }

  if (artifact.redistributed && policy.requiresNoticesForRedistribution && !artifact.noticePresent) {
    warnings.push(finding(
      "notice_missing",
      artifact.id,
      "solver-team",
      "Redistributed artifact is missing attribution or license notice evidence.",
      `Attach notice and attribution evidence for ${artifact.id}.`,
    ));
  }

  if (artifact.type === "dataset") {
    evaluateDataset(policy, submission, artifact, blockers);
  }

  if (artifact.type === "model") {
    evaluateModel(policy, artifact, blockers, warnings);
  }
}

function evaluateDataset(policy, submission, artifact, blockers) {
  if (artifact.containsHumanData && !policy.allowsRestrictedHumanData) {
    blockers.push(finding(
      "restricted_human_data",
      artifact.id,
      "data-steward",
      "Human-derived data is included but the challenge does not allow restricted human data.",
      "Remove the raw dataset, replace it with a synthetic digest, or get sponsor and ethics approval.",
    ));
  }

  if (artifact.containsHumanData && !artifact.consentForChallenge) {
    blockers.push(finding(
      "missing_consent",
      artifact.id,
      "ethics-reviewer",
      "Dataset does not show consent for this challenge use.",
      "Attach consent evidence or redact the dataset from the submission package.",
    ));
  }

  if (artifact.redistributed && artifact.license && /Restricted|DUA|NoRedistribution/i.test(artifact.license)) {
    blockers.push(finding(
      "data_redistribution_blocked",
      artifact.id,
      "data-steward",
      `Dataset license ${artifact.license} does not permit raw redistribution.`,
      "Convert to reviewer-safe derived features or keep raw data in a controlled data room.",
    ));
  }

  if (artifact.containsHumanData && submission.reviewerAccess && submission.reviewerAccess.sponsorCanDownloadRawData) {
    blockers.push(finding(
      "raw_data_download_risk",
      artifact.id,
      "platform-operator",
      "Sponsor download access is enabled for restricted raw data.",
      "Disable raw download and expose only approved aggregate reviewer packets.",
    ));
  }
}

function evaluateModel(policy, artifact, blockers, warnings) {
  if (artifact.redistributed && artifact.commercialUseAllowed === false) {
    blockers.push(finding(
      "model_commercial_use_blocked",
      artifact.id,
      "model-reviewer",
      "Model weights are redistributed but do not allow sponsor commercial evaluation.",
      "Use an allowed model license or provide an inference-only review endpoint.",
    ));
  }

  if (artifact.trainingDataProvenance !== "documented") {
    warnings.push(finding(
      "model_provenance_unknown",
      artifact.id,
      "model-reviewer",
      "Model training-data provenance is not fully documented.",
      "Attach training-data provenance notes before final award review.",
    ));
  }
}

function evaluateDependency(policy, dependency, blockers, warnings) {
  if (!isPinnedVersion(dependency.version) && dependency.direct) {
    warnings.push(finding(
      "dependency_unpinned",
      dependency.name,
      "solver-team",
      `Direct dependency ${dependency.name}@${dependency.version} is not pinned.`,
      "Pin the dependency version so the submission can be reproduced.",
    ));
  }

  if (dependency.license && !policy.allowedCodeLicenses.includes(dependency.license)) {
    const bucket = policy.allowsCopyleftInRuntime ? warnings : blockers;
    bucket.push(finding(
      "dependency_license_incompatible",
      dependency.name,
      "license-reviewer",
      `Dependency license ${dependency.license} is outside the challenge code allowlist.`,
      `Replace ${dependency.name} or document a sponsor-approved exception.`,
    ));
  }

  if (dependency.advisory) {
    const maxAllowed = SEVERITY_RANK[policy.maxDependencySeverity] || 0;
    const actual = SEVERITY_RANK[dependency.advisory.severity] || 0;
    const bucket = actual > maxAllowed ? blockers : warnings;
    bucket.push(finding(
      "dependency_advisory",
      dependency.name,
      "security-reviewer",
      `${dependency.name} has ${dependency.advisory.severity} advisory ${dependency.advisory.id}.`,
      `Upgrade to ${dependency.advisory.fixedVersion} or provide a compensating-control note.`,
    ));
  }
}

function evaluateExportDisclosure(submission, blockers, warnings) {
  const declared = new Set(submission.declaredExportControls || []);
  for (const artifact of submission.artifacts || []) {
    if (!artifact.exportClassification || artifact.exportClassification === "none") {
      continue;
    }

    const exportFinding = finding(
      "export_disclosure_missing",
      artifact.id,
      "sponsor-admin",
      `Artifact has export classification ${artifact.exportClassification} but no matching challenge disclosure.`,
      "Add sponsor-visible export-control handling before reviewer access.",
    );

    if (declared.has(artifact.exportClassification)) {
      warnings.push({ ...exportFinding, detail: `${exportFinding.detail} Disclosure exists; verify reviewer geography before download.` });
    } else {
      blockers.push(exportFinding);
    }
  }
}

function allowedLicensesForType(policy, type) {
  if (type === "code") {
    return policy.allowedCodeLicenses || [];
  }
  if (type === "dataset") {
    return policy.allowedDataLicenses || [];
  }
  if (type === "model") {
    return policy.allowedModelLicenses || [];
  }
  return [];
}

function isPinnedVersion(version) {
  return typeof version === "string" && /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/.test(version);
}

function finding(code, subject, ownerRole, detail, remediation) {
  return {
    code,
    subject,
    ownerRole,
    detail,
    remediation,
  };
}

function buildActions(blockers, warnings) {
  return [...blockers.map((item) => ({ ...item, priority: "blocker" })), ...warnings.map((item) => ({ ...item, priority: "warning" }))]
    .sort((left, right) => prioritySort(left.priority) - prioritySort(right.priority) || left.code.localeCompare(right.code));
}

function prioritySort(priority) {
  return priority === "blocker" ? 0 : 1;
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function renderMarkdownReport(packet) {
  const lines = [
    `# Submission License Risk Report: ${packet.submissionId}`,
    "",
    `Status: ${packet.status}`,
    `Team: ${packet.team}`,
    `Audit digest: ${packet.fingerprint}`,
    "",
    "## Summary",
    "",
    `- Blockers: ${packet.summary.blockers}`,
    `- Warnings: ${packet.summary.warnings}`,
    `- Artifacts reviewed: ${packet.summary.artifactsReviewed}`,
    `- Dependencies reviewed: ${packet.summary.dependenciesReviewed}`,
    "",
    "## Actions",
    "",
  ];

  for (const action of packet.actions) {
    lines.push(`- ${action.priority.toUpperCase()} [${action.ownerRole}] ${action.subject}: ${action.remediation}`);
  }

  if (packet.actions.length === 0) {
    lines.push("- No remediation actions required before sponsor review.");
  }

  lines.push("");
  lines.push("Synthetic local demo data only; no live services, private datasets, or external scanners were used.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(packet) {
  const statusColor = packet.status === "review_ready" ? "#15803d" : packet.status === "conditional_review" ? "#a16207" : "#b91c1c";
  const actions = packet.actions.slice(0, 4);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
    '<rect width="1280" height="720" fill="#101827"/>',
    '<rect x="72" y="68" width="1136" height="584" rx="24" fill="#f8fafc"/>',
    `<text x="120" y="140" font-family="Arial" font-size="42" font-weight="700" fill="${statusColor}">Submission License Risk Guard</text>`,
    `<text x="120" y="202" font-family="Arial" font-size="27" fill="#111827">Status: ${escapeXml(packet.status.toUpperCase())}</text>`,
    `<text x="120" y="250" font-family="Arial" font-size="24" fill="#334155">Blockers: ${packet.summary.blockers}   Warnings: ${packet.summary.warnings}   Digest: ${escapeXml(packet.fingerprint.slice(0, 14))}</text>`,
    '<line x1="120" y1="292" x2="1160" y2="292" stroke="#cbd5e1" stroke-width="3"/>',
    ...actions.map((action, index) => (
      `<text x="120" y="${352 + index * 48}" font-family="Arial" font-size="23" fill="#1f2937">${escapeXml(action.priority)} - ${escapeXml(action.subject)} - ${escapeXml(action.ownerRole)}</text>`
    )),
    '<text x="120" y="604" font-family="Arial" font-size="22" fill="#475569">Pre-review policy packet generated from synthetic solver deliverables.</text>',
    "</svg>",
  ].join("\n");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  evaluateSubmissionLicenseRisk,
  renderMarkdownReport,
  renderSvgSummary,
  isPinnedVersion,
};
