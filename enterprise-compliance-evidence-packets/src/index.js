"use strict";

const crypto = require("node:crypto");

const DEFAULT_POLICY = Object.freeze({
  minimumReproducibilityScore: 0.75,
  requiredOpenAccess: true,
  requiredDataAvailability: true,
  requiredAiReview: true,
  requiredVersionHistory: true,
  requiredOrcidCoverage: 0.8,
  exportTargets: ["institutional_repository", "funder_report", "preprint"]
});

function buildEvidencePackets(input, options = {}) {
  if (!input || typeof input !== "object") {
    throw new TypeError("input must be an object");
  }

  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) };
  const generatedAt = options.generatedAt || input.generatedAt || new Date().toISOString();
  const projects = Array.isArray(input.projects) ? input.projects : [];
  const packets = projects.map((project) => evaluateProject(project, policy, generatedAt));

  return {
    institution: input.institution || "Unknown institution",
    generatedAt,
    policy,
    dashboard: buildDashboard(packets),
    packets
  };
}

function evaluateProject(project, policy, generatedAt) {
  const evidence = project.evidence || {};
  const gaps = [];
  const exportPlan = buildExportPlan(project, policy);
  const orcidCoverage = calculateOrcidCoverage(project.contributors || []);

  if (policy.requiredOpenAccess && evidence.openAccess !== true) {
    gaps.push(gap("open_access", "blocker", "Open access evidence is missing or false."));
  }

  if (policy.requiredDataAvailability && !hasDataAvailability(evidence.dataAvailability)) {
    gaps.push(gap("data_availability", "blocker", "Data availability location is missing."));
  }

  if (numberOrZero(evidence.reproducibilityScore) < policy.minimumReproducibilityScore) {
    gaps.push(
      gap(
        "reproducibility",
        "high",
        `Reproducibility score is below ${formatPercent(policy.minimumReproducibilityScore)}.`
      )
    );
  }

  if (policy.requiredAiReview && evidence.aiReviewCompleted !== true) {
    gaps.push(gap("ai_review", "medium", "AI review completion evidence is missing."));
  }

  if (policy.requiredVersionHistory && evidence.versionHistory !== true) {
    gaps.push(gap("version_history", "medium", "Version history evidence is missing."));
  }

  if (orcidCoverage < policy.requiredOrcidCoverage) {
    gaps.push(
      gap(
        "orcid_coverage",
        "medium",
        `ORCID coverage is ${formatPercent(orcidCoverage)}, below ${formatPercent(policy.requiredOrcidCoverage)}.`
      )
    );
  }

  for (const target of exportPlan) {
    if (!target.ready) {
      gaps.push(gap(`export_${target.name}`, "high", target.reason));
    }
  }

  const status = statusFromGaps(gaps);
  const readinessScore = calculateReadinessScore(gaps);
  const evidenceDigest = hashObject({
    projectId: project.id,
    evidence,
    exports: project.exports || {},
    policy
  });
  const packetDigest = hashObject({
    projectId: project.id,
    status,
    readinessScore,
    gaps,
    evidenceDigest,
    generatedAt
  });

  return {
    projectId: project.id,
    title: project.title,
    department: project.department || "Unassigned",
    tags: Array.isArray(project.tags) ? project.tags : [],
    principalInvestigator: project.principalInvestigator || "Unknown",
    status,
    readinessScore,
    generatedAt,
    orcidCoverage,
    evidenceDigest,
    packetDigest,
    gaps,
    exportPlan,
    recommendedActions: buildRecommendedActions(gaps),
    auditSummary: buildAuditSummary(project, status, readinessScore, evidenceDigest)
  };
}

function buildExportPlan(project, policy) {
  const configuredExports = project.exports || {};

  return policy.exportTargets.map((targetName) => {
    const target = configuredExports[targetName];

    if (!target || target.enabled !== true) {
      return {
        name: targetName,
        ready: false,
        reason: `${targetName} export target is not configured or disabled.`
      };
    }

    if (!target.format) {
      return {
        name: targetName,
        ready: false,
        reason: `${targetName} export target has no output format.`
      };
    }

    return {
      name: targetName,
      ready: true,
      target: target.target || targetName,
      format: target.format
    };
  });
}

function buildDashboard(packets) {
  const byStatus = countBy(packets, "status");
  const byDepartment = countBy(packets, "department");
  const topGaps = {};

  for (const packet of packets) {
    for (const item of packet.gaps) {
      topGaps[item.code] = (topGaps[item.code] || 0) + 1;
    }
  }

  return {
    totalProjects: packets.length,
    ready: byStatus.ready || 0,
    needsReview: byStatus.needs_review || 0,
    blocked: byStatus.blocked || 0,
    byDepartment,
    topGaps
  };
}

function createWebhookEnvelope(packet, options = {}) {
  const payload = {
    eventType: "enterprise.evidence_packet.evaluated",
    projectId: packet.projectId,
    status: packet.status,
    readinessScore: packet.readinessScore,
    packetDigest: packet.packetDigest,
    generatedAt: packet.generatedAt
  };

  const envelope = {
    id: hashObject(payload).slice(0, 16),
    payload
  };

  if (options.secret) {
    envelope.signature = crypto
      .createHmac("sha256", options.secret)
      .update(canonicalize(payload))
      .digest("hex");
  }

  return envelope;
}

function renderMarkdown(result) {
  const lines = [
    `# Enterprise Compliance Evidence Packets`,
    ``,
    `Institution: ${result.institution}`,
    `Generated: ${result.generatedAt}`,
    ``,
    `## Dashboard`,
    ``,
    `- Total projects: ${result.dashboard.totalProjects}`,
    `- Ready: ${result.dashboard.ready}`,
    `- Needs review: ${result.dashboard.needsReview}`,
    `- Blocked: ${result.dashboard.blocked}`,
    ``
  ];

  for (const packet of result.packets) {
    lines.push(`## ${packet.title}`);
    lines.push("");
    lines.push(`- Project ID: ${packet.projectId}`);
    lines.push(`- Department: ${packet.department}`);
    lines.push(`- Status: ${packet.status}`);
    lines.push(`- Readiness score: ${packet.readinessScore}`);
    lines.push(`- Evidence digest: ${packet.evidenceDigest}`);
    lines.push(`- Packet digest: ${packet.packetDigest}`);
    lines.push("");
    lines.push("### Export Plan");
    for (const target of packet.exportPlan) {
      lines.push(`- ${target.name}: ${target.ready ? "ready" : `blocked - ${target.reason}`}`);
    }
    lines.push("");
    lines.push("### Gaps");
    if (packet.gaps.length === 0) {
      lines.push("- None");
    } else {
      for (const item of packet.gaps) {
        lines.push(`- [${item.severity}] ${item.code}: ${item.message}`);
      }
    }
    lines.push("");
    lines.push("### Recommended Actions");
    for (const action of packet.recommendedActions) {
      lines.push(`- ${action}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function buildRecommendedActions(gaps) {
  if (gaps.length === 0) {
    return ["Approve packet for configured exports."];
  }

  return gaps.map((item) => {
    switch (item.code) {
      case "open_access":
        return "Attach open-access status evidence before export.";
      case "data_availability":
        return "Add a public, controlled-access, or included data availability location.";
      case "reproducibility":
        return "Run the reproducibility checker again and attach the passing report.";
      case "ai_review":
        return "Complete an AI review and add the review artifact to the packet.";
      case "version_history":
        return "Attach version history or release provenance before submission.";
      case "orcid_coverage":
        return "Collect ORCID identifiers for missing contributors.";
      default:
        if (item.code.startsWith("export_")) {
          return `Configure ${item.code.replace("export_", "")} export target.`;
        }
        return `Resolve ${item.code}.`;
    }
  });
}

function buildAuditSummary(project, status, readinessScore, evidenceDigest) {
  return {
    decision: status === "ready" ? "export_ready" : "hold_for_evidence",
    projectId: project.id,
    title: project.title,
    readinessScore,
    evidenceDigest,
    reviewerNote:
      status === "ready"
        ? "Packet has enough evidence for configured enterprise exports."
        : "Packet should stay in review until listed evidence gaps are resolved."
  };
}

function statusFromGaps(gaps) {
  if (gaps.some((item) => item.severity === "blocker")) {
    return "blocked";
  }
  if (gaps.length > 0) {
    return "needs_review";
  }
  return "ready";
}

function calculateReadinessScore(gaps) {
  const penalty = gaps.reduce((total, item) => {
    if (item.severity === "blocker") return total + 35;
    if (item.severity === "high") return total + 20;
    return total + 10;
  }, 0);

  return Math.max(0, 100 - penalty);
}

function calculateOrcidCoverage(contributors) {
  if (contributors.length === 0) {
    return 0;
  }

  const contributorsWithOrcid = contributors.filter((contributor) => Boolean(contributor.orcid));
  return contributorsWithOrcid.length / contributors.length;
}

function hasDataAvailability(value) {
  return ["public_repository", "controlled_access", "included"].includes(value);
}

function gap(code, severity, message) {
  return { code, severity, message };
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] || "unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function hashObject(value) {
  return crypto.createHash("sha256").update(canonicalize(value)).digest("hex");
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function numberOrZero(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

module.exports = {
  DEFAULT_POLICY,
  buildEvidencePackets,
  evaluateProject,
  buildExportPlan,
  buildDashboard,
  createWebhookEnvelope,
  renderMarkdown,
  canonicalize,
  hashObject
};
