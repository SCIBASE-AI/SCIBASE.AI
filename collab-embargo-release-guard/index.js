"use strict";

const crypto = require("crypto");

const STATUS = {
  PASS: "pass",
  HOLD: "hold",
  BLOCK: "block",
};

const SEVERITY_WEIGHT = {
  blocker: 100,
  warning: 10,
  pass: 0,
};

function evaluateEmbargoRelease(workspace, options = {}) {
  const releaseAt = parseDate(
    options.releaseAt || workspace.releasePackage.releaseAt,
    "releasePackage.releaseAt",
  );
  const generatedAt = options.generatedAt || new Date(0).toISOString();
  const checks = [];

  checks.push(...checkEmbargoWindows(workspace, releaseAt));
  checks.push(...checkBlindReview(workspace));
  checks.push(...checkRestrictedArtifacts(workspace));
  checks.push(...checkPrivateCollaborationState(workspace));
  checks.push(...checkApprovedVersions(workspace));
  checks.push(...checkReleaseClock(workspace, releaseAt));

  const blockers = checks.filter((check) => check.severity === "blocker");
  const warnings = checks.filter((check) => check.severity === "warning");
  const status = blockers.length > 0
    ? STATUS.BLOCK
    : warnings.length > 0
      ? STATUS.HOLD
      : STATUS.PASS;

  const actions = buildActions(checks);
  const safeManifest = buildSafeManifest(workspace, releaseAt);
  const riskScore = checks.reduce(
    (sum, check) => sum + SEVERITY_WEIGHT[check.severity],
    0,
  );
  const fingerprint = digest({
    releaseId: workspace.releasePackage.id,
    status,
    blockers: blockers.map((check) => check.id),
    warnings: warnings.map((check) => check.id),
    safeManifest,
  });

  return {
    generatedAt,
    releaseId: workspace.releasePackage.id,
    releaseChannel: workspace.releasePackage.channel,
    releaseAt: releaseAt.toISOString(),
    status,
    riskScore,
    fingerprint,
    summary: {
      checks: checks.length,
      blockers: blockers.length,
      warnings: warnings.length,
      passes: checks.filter((check) => check.severity === "pass").length,
    },
    checks,
    actions,
    safeManifest,
  };
}

function checkEmbargoWindows(workspace, releaseAt) {
  const included = new Set(workspace.releasePackage.artifactIds);
  const checks = [];

  for (const embargo of workspace.policy.embargoes || []) {
    const endsAt = parseDate(embargo.endsAt, `embargoes.${embargo.id}.endsAt`);
    const includedArtifacts = embargo.artifactIds.filter((id) => included.has(id));
    if (includedArtifacts.length === 0) {
      checks.push(passCheck(
        `embargo-${embargo.id}-not-in-package`,
        "Embargo does not apply to the release package.",
        { embargo: embargo.id },
      ));
      continue;
    }

    if (releaseAt < endsAt) {
      checks.push(blockerCheck(
        `embargo-${embargo.id}-active`,
        "Release package contains artifacts before their embargo window ends.",
        {
          embargo: embargo.id,
          endsAt: endsAt.toISOString(),
          artifacts: includedArtifacts,
          releaseAt: releaseAt.toISOString(),
        },
      ));
    } else {
      checks.push(passCheck(
        `embargo-${embargo.id}-expired`,
        "Embargo window has expired before release.",
        {
          embargo: embargo.id,
          endsAt: endsAt.toISOString(),
          artifacts: includedArtifacts,
        },
      ));
    }

    if (!embargo.timezone) {
      checks.push(warningCheck(
        `embargo-${embargo.id}-missing-timezone`,
        "Embargo window is missing a declared policy timezone.",
        { embargo: embargo.id },
      ));
    }
  }

  return checks;
}

function checkBlindReview(workspace) {
  const reviewMode = workspace.policy.reviewMode;
  if (!["single_blind", "double_blind"].includes(reviewMode)) {
    return [passCheck("blind-review-not-required", "Blind-review redaction is not required.")];
  }

  const exposed = [];
  for (const field of ["authors", "affiliations", "correspondingAuthor"]) {
    if (hasVisibleValue(workspace.releasePackage.metadata[field])) {
      exposed.push(`metadata.${field}`);
    }
  }

  for (const section of workspace.sections) {
    if (!workspace.releasePackage.sectionIds.includes(section.id)) {
      continue;
    }
    if (section.blindReviewRequired && containsIdentity(section.exportText)) {
      exposed.push(`section.${section.id}.exportText`);
    }
  }

  if (exposed.length > 0) {
    return [blockerCheck(
      "blind-review-identity-leak",
      "Blind-review release package exposes author or affiliation identity fields.",
      { reviewMode, exposed },
    )];
  }

  return [passCheck(
    "blind-review-identity-redacted",
    "Blind-review package has no visible author or affiliation identity fields.",
    { reviewMode },
  )];
}

function checkRestrictedArtifacts(workspace) {
  const included = new Set(workspace.releasePackage.artifactIds);
  const checks = [];

  for (const artifact of workspace.artifacts) {
    if (!included.has(artifact.id)) {
      continue;
    }

    if (!["restricted", "private", "embargoed"].includes(artifact.classification)) {
      checks.push(passCheck(
        `artifact-${artifact.id}-public`,
        "Artifact is public-safe for this release package.",
        { artifact: artifact.id },
      ));
      continue;
    }

    if (artifact.releaseTreatment === "redacted" && artifact.redactionDigest) {
      checks.push(warningCheck(
        `artifact-${artifact.id}-redacted`,
        "Restricted artifact is included only through a redacted digest.",
        {
          artifact: artifact.id,
          classification: artifact.classification,
          redactionDigest: artifact.redactionDigest,
        },
      ));
      continue;
    }

    checks.push(blockerCheck(
      `artifact-${artifact.id}-restricted`,
      "Restricted artifact is included without a release-safe redaction treatment.",
      {
        artifact: artifact.id,
        classification: artifact.classification,
        releaseTreatment: artifact.releaseTreatment || "none",
      },
    ));
  }

  return checks;
}

function checkPrivateCollaborationState(workspace) {
  const checks = [];
  const exportedThreads = new Set(workspace.releasePackage.threadIds || []);
  const exportedPresence = workspace.releasePackage.includePresenceSnapshots;

  for (const thread of workspace.threads) {
    if (!exportedThreads.has(thread.id)) {
      continue;
    }
    const allowed = thread.visibility === "public"
      || thread.visibility === "journal_editor";
    if (!allowed) {
      checks.push(blockerCheck(
        `thread-${thread.id}-private-export`,
        "Release package exports a private collaboration thread.",
        {
          thread: thread.id,
          visibility: thread.visibility,
          section: thread.sectionId,
        },
      ));
    } else if (thread.unresolved && thread.blocksRelease) {
      checks.push(blockerCheck(
        `thread-${thread.id}-unresolved-blocker`,
        "Release package still has an unresolved blocking review thread.",
        {
          thread: thread.id,
          section: thread.sectionId,
        },
      ));
    } else {
      checks.push(passCheck(
        `thread-${thread.id}-release-safe`,
        "Exported collaboration thread is release-safe.",
        { thread: thread.id },
      ));
    }
  }

  if (exportedPresence) {
    checks.push(warningCheck(
      "presence-snapshots-exported",
      "Live presence snapshots are included; verify they are sanitized before external release.",
      { includePresenceSnapshots: true },
    ));
  } else {
    checks.push(passCheck(
      "presence-snapshots-excluded",
      "Live cursor and presence snapshots are excluded from the release package.",
    ));
  }

  return checks;
}

function checkApprovedVersions(workspace) {
  const checks = [];
  const latestById = new Map(workspace.sections.map((section) => [section.id, section]));

  for (const exported of workspace.releasePackage.sections) {
    const section = latestById.get(exported.id);
    if (!section) {
      checks.push(blockerCheck(
        `section-${exported.id}-missing`,
        "Release package references a section that does not exist in the editor state.",
        { section: exported.id },
      ));
      continue;
    }

    if (exported.version !== section.approvedVersion) {
      checks.push(blockerCheck(
        `section-${exported.id}-version-drift`,
        "Exported section version differs from the approved collaborative version.",
        {
          section: exported.id,
          exportedVersion: exported.version,
          approvedVersion: section.approvedVersion,
          latestVersion: section.latestVersion,
        },
      ));
      continue;
    }

    if (section.latestVersion !== section.approvedVersion) {
      checks.push(warningCheck(
        `section-${exported.id}-newer-draft-exists`,
        "A newer draft exists after the approved release version.",
        {
          section: exported.id,
          approvedVersion: section.approvedVersion,
          latestVersion: section.latestVersion,
        },
      ));
      continue;
    }

    checks.push(passCheck(
      `section-${exported.id}-approved`,
      "Exported section matches the approved collaborative version.",
      { section: exported.id, version: exported.version },
    ));
  }

  return checks;
}

function checkReleaseClock(workspace, releaseAt) {
  const checks = [];
  const gate = workspace.policy.releaseClock || {};

  if (!gate.timezone) {
    checks.push(warningCheck(
      "release-clock-timezone-missing",
      "Release clock policy does not declare the governing timezone.",
    ));
  }

  if (gate.notBefore) {
    const notBefore = parseDate(gate.notBefore, "policy.releaseClock.notBefore");
    if (releaseAt < notBefore) {
      checks.push(blockerCheck(
        "release-clock-before-not-before",
        "Release is scheduled before the policy not-before timestamp.",
        {
          releaseAt: releaseAt.toISOString(),
          notBefore: notBefore.toISOString(),
        },
      ));
    } else {
      checks.push(passCheck(
        "release-clock-after-not-before",
        "Release is scheduled after the policy not-before timestamp.",
        {
          releaseAt: releaseAt.toISOString(),
          notBefore: notBefore.toISOString(),
        },
      ));
    }
  }

  if (!workspace.releasePackage.releaseAt.endsWith("Z")) {
    checks.push(warningCheck(
      "release-clock-non-utc-input",
      "Release timestamp is not stored as an explicit UTC instant.",
      { releaseAt: workspace.releasePackage.releaseAt },
    ));
  }

  return checks;
}

function buildActions(checks) {
  return checks
    .filter((check) => check.severity !== "pass")
    .map((check) => ({
      id: `action-${check.id}`,
      sourceCheck: check.id,
      priority: check.severity === "blocker" ? "must_fix" : "review",
      ownerRole: ownerForCheck(check.id),
      instruction: actionInstruction(check),
    }));
}

function buildSafeManifest(workspace, releaseAt) {
  const publicArtifacts = workspace.artifacts
    .filter((artifact) => workspace.releasePackage.artifactIds.includes(artifact.id))
    .filter((artifact) => artifact.classification === "public"
      || artifact.releaseTreatment === "redacted")
    .map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      treatment: artifact.releaseTreatment || "full",
      digest: artifact.redactionDigest || artifact.digest,
    }));

  return {
    id: workspace.releasePackage.id,
    channel: workspace.releasePackage.channel,
    releaseAt: releaseAt.toISOString(),
    sections: workspace.releasePackage.sections.map((section) => ({
      id: section.id,
      version: section.version,
    })),
    artifacts: publicArtifacts,
    metadata: {
      title: workspace.releasePackage.metadata.title,
      reviewMode: workspace.policy.reviewMode,
      authorsRedacted: !hasVisibleValue(workspace.releasePackage.metadata.authors),
      affiliationsRedacted: !hasVisibleValue(workspace.releasePackage.metadata.affiliations),
    },
  };
}

function renderMarkdownReport(packet) {
  const lines = [
    "# Collaborative Embargo Release Guard",
    "",
    `Release: \`${packet.releaseId}\``,
    `Channel: \`${packet.releaseChannel}\``,
    `Status: \`${packet.status}\``,
    `Risk score: \`${packet.riskScore}\``,
    `Fingerprint: \`${packet.fingerprint}\``,
    "",
    "## Summary",
    "",
    `- Checks: ${packet.summary.checks}`,
    `- Blockers: ${packet.summary.blockers}`,
    `- Warnings: ${packet.summary.warnings}`,
    `- Passes: ${packet.summary.passes}`,
    "",
    "## Checks",
    "",
  ];

  for (const check of packet.checks) {
    lines.push(
      `- **${check.severity.toUpperCase()}** \`${check.id}\`: ${check.message}`,
    );
  }

  lines.push("", "## Actions", "");
  if (packet.actions.length === 0) {
    lines.push("- No release actions required.");
  } else {
    for (const action of packet.actions) {
      lines.push(
        `- \`${action.priority}\` ${action.ownerRole}: ${action.instruction}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(packet) {
  const color = packet.status === STATUS.BLOCK
    ? "#c2410c"
    : packet.status === STATUS.HOLD
      ? "#a16207"
      : "#047857";
  const safeStatus = escapeXml(packet.status.toUpperCase());
  const fingerprint = escapeXml(packet.fingerprint.slice(0, 16));
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">',
    '<rect width="960" height="540" fill="#f8fafc"/>',
    '<rect x="48" y="48" width="864" height="444" rx="18" fill="#ffffff" stroke="#cbd5e1"/>',
    `<text x="84" y="112" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${color}">Embargo release ${safeStatus}</text>`,
    `<text x="84" y="164" font-family="Arial, sans-serif" font-size="22" fill="#0f172a">Release: ${escapeXml(packet.releaseId)}</text>`,
    `<text x="84" y="206" font-family="Arial, sans-serif" font-size="22" fill="#0f172a">Blockers: ${packet.summary.blockers}   Warnings: ${packet.summary.warnings}   Passes: ${packet.summary.passes}</text>`,
    `<text x="84" y="248" font-family="Arial, sans-serif" font-size="22" fill="#0f172a">Risk score: ${packet.riskScore}</text>`,
    `<text x="84" y="290" font-family="Arial, sans-serif" font-size="18" fill="#475569">Fingerprint: ${fingerprint}</text>`,
    '<line x1="84" y1="326" x2="876" y2="326" stroke="#e2e8f0" stroke-width="2"/>',
    ...packet.actions.slice(0, 4).map((action, index) => (
      `<text x="84" y="${370 + index * 34}" font-family="Arial, sans-serif" font-size="18" fill="#334155">${escapeXml(action.priority)}: ${escapeXml(action.ownerRole)}</text>`
    )),
    "</svg>",
  ].join("\n");
}

function parseDate(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for ${label}: ${value}`);
  }
  return date;
}

function hasVisibleValue(value) {
  if (Array.isArray(value)) {
    return value.some((item) => hasVisibleValue(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => hasVisibleValue(item));
  }
  return typeof value === "string" && value.trim().length > 0;
}

function containsIdentity(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /university|laboratory|@|corresponding author|affiliation/i.test(value);
}

function ownerForCheck(id) {
  if (id.includes("embargo") || id.includes("release-clock")) {
    return "managing_editor";
  }
  if (id.includes("blind") || id.includes("thread") || id.includes("presence")) {
    return "collaboration_lead";
  }
  if (id.includes("artifact")) {
    return "data_steward";
  }
  return "section_owner";
}

function actionInstruction(check) {
  if (check.id.includes("embargo")) {
    return "Remove embargoed artifacts or move release time after the embargo end.";
  }
  if (check.id.includes("release-clock")) {
    return "Move the release time after the not-before gate or update the governing policy clock.";
  }
  if (check.id.includes("blind")) {
    return "Redact author and affiliation identity fields before external review export.";
  }
  if (check.id.includes("artifact")) {
    return "Replace restricted files with release-safe redacted digests.";
  }
  if (check.id.includes("thread")) {
    return "Resolve or exclude private review threads before release.";
  }
  if (check.id.includes("section")) {
    return "Export the approved section version or re-approve the latest draft.";
  }
  if (check.id.includes("presence")) {
    return "Exclude live presence snapshots from external release packets.";
  }
  return "Review policy mismatch before release.";
}

function passCheck(id, message, evidence = {}) {
  return { id, severity: "pass", message, evidence };
}

function warningCheck(id, message, evidence = {}) {
  return { id, severity: "warning", message, evidence };
}

function blockerCheck(id, message, evidence = {}) {
  return { id, severity: "blocker", message, evidence };
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  STATUS,
  evaluateEmbargoRelease,
  renderMarkdownReport,
  renderSvgSummary,
};
