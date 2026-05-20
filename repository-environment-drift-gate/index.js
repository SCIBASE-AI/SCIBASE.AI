"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const LARGE_FILE_THRESHOLD_MB = 100;

function compareComponents(baseline, candidate) {
  return Object.entries(candidate.components).map(([name, current]) => {
    const prior = baseline.components[name];
    const changed = !prior || prior.hash !== current.hash;
    const largeFileMissingLfs = (current.sizeMb || 0) >= LARGE_FILE_THRESHOLD_MB && !current.lfs;
    return {
      name,
      path: current.path,
      previousHash: prior ? prior.hash : null,
      currentHash: current.hash,
      changed,
      sizeMb: current.sizeMb || null,
      lfsRequired: (current.sizeMb || 0) >= LARGE_FILE_THRESHOLD_MB,
      lfsConfigured: Boolean(current.lfs),
      largeFileMissingLfs
    };
  });
}

function compareEnvironment(baseline, candidate) {
  const fields = [
    "dockerfileHash",
    "condaLockHash",
    "python",
    "r",
    "cuda",
    "notebookKernel",
    "secretsPolicy"
  ];
  const diffs = fields
    .filter((field) => baseline.environment[field] !== candidate.environment[field])
    .map((field) => ({
      field,
      previous: baseline.environment[field],
      current: candidate.environment[field],
      severity: ["dockerfileHash", "condaLockHash", "notebookKernel"].includes(field) ? "high" : "medium"
    }));

  const previousPackages = new Set(baseline.environment.systemPackages || []);
  const currentPackages = new Set(candidate.environment.systemPackages || []);
  const addedPackages = [...currentPackages].filter((pkg) => !previousPackages.has(pkg));
  const removedPackages = [...previousPackages].filter((pkg) => !currentPackages.has(pkg));

  if (addedPackages.length || removedPackages.length) {
    diffs.push({
      field: "systemPackages",
      previous: removedPackages,
      current: addedPackages,
      severity: "medium"
    });
  }

  return diffs;
}

function staleRerunDays(candidate) {
  const captured = new Date(candidate.capturedAt);
  const rerun = new Date(candidate.reproducibility.lastRerunAt);
  return Math.max(0, Math.round((captured - rerun) / (1000 * 60 * 60 * 24)));
}

function semanticVersionImpact(componentDiffs, environmentDiffs) {
  if (environmentDiffs.some((diff) => diff.severity === "high")) return "major";
  if (componentDiffs.some((diff) => diff.name === "data" && diff.changed)) return "minor";
  if (componentDiffs.some((diff) => diff.changed)) return "patch";
  return "none";
}

function releaseDecision(componentDiffs, environmentDiffs, candidate) {
  const blockers = [];
  if (componentDiffs.some((diff) => diff.largeFileMissingLfs)) {
    blockers.push("large-file-not-routed-through-lfs");
  }
  if (environmentDiffs.some((diff) => diff.severity === "high")) {
    blockers.push("high-severity-environment-drift");
  }
  if (staleRerunDays(candidate) > 14) {
    blockers.push("stale-reproducibility-rerun");
  }
  if (candidate.reproducibility.confidenceScore < 0.8) {
    blockers.push("low-reproducibility-confidence");
  }

  return {
    decision: blockers.length ? "quarantine-release" : "release-ready",
    blockers
  };
}

function buildRollbackPlan(baseline, candidate, decision, semverImpact) {
  const actions = [
    {
      action: "tag-current-candidate",
      command: `git tag ${candidate.tag} ${candidate.commit}`,
      required: true
    },
    {
      action: "preserve-baseline-rollback",
      command: `git tag rollback/${baseline.tag} ${baseline.commit}`,
      required: true
    }
  ];

  if (decision.decision === "quarantine-release") {
    actions.push({
      action: "open-quarantine-branch",
      command: `git switch -c quarantine/${candidate.tag}`,
      required: true
    });
  }

  actions.push({
    action: "semantic-version-review",
    command: `record release impact as ${semverImpact}`,
    required: semverImpact !== "none"
  });

  return actions;
}

function auditRepositoryEnvironmentDrift(baseline, candidate) {
  const componentDiffs = compareComponents(baseline, candidate);
  const environmentDiffs = compareEnvironment(baseline, candidate);
  const semverImpact = semanticVersionImpact(componentDiffs, environmentDiffs);
  const decision = releaseDecision(componentDiffs, environmentDiffs, candidate);
  const staleDays = staleRerunDays(candidate);
  const reviewerTasks = [
    ...componentDiffs
      .filter((diff) => diff.largeFileMissingLfs)
      .map((diff) => ({
        type: "lfs-routing",
        target: diff.path,
        message: `${diff.path} is ${diff.sizeMb} MB and must be routed through Git LFS before release.`
      })),
    ...environmentDiffs.map((diff) => ({
      type: "environment-drift",
      target: diff.field,
      message: `${diff.field} changed from ${formatValue(diff.previous)} to ${formatValue(diff.current)}.`
    }))
  ];

  if (staleDays > 14) {
    reviewerTasks.push({
      type: "rerun-required",
      target: candidate.reproducibility.rawToResultsHash,
      message: `Last reproducibility rerun is ${staleDays} days old; rerun raw data to results before tagging.`
    });
  }

  const audit = {
    baselineId: baseline.id,
    candidateId: candidate.id,
    generatedAt: new Date("2026-05-20T10:00:00.000Z").toISOString(),
    componentDiffs,
    environmentDiffs,
    staleRerunDays: staleDays,
    semanticVersionImpact: semverImpact,
    releaseDecision: decision.decision,
    blockers: decision.blockers,
    rollbackPlan: buildRollbackPlan(baseline, candidate, decision, semverImpact),
    reviewerTasks,
    requirementCoverage: {
      fileAndMetadataVersioning: ["componentDiffs", "semanticVersionImpact", "auditDigest"],
      gitCompatibleBackend: ["rollbackPlan", "tag-current-candidate", "quarantine branch"],
      computationAwareReproducibility: ["environmentDiffs", "staleRerunDays", "confidenceScore"],
      containerSupport: ["dockerfileHash", "condaLockHash", "systemPackages"],
      largeFileRouting: ["lfsRequired", "lfsConfigured", "largeFileMissingLfs"]
    }
  };

  audit.auditDigest = crypto
    .createHash("sha256")
    .update(JSON.stringify({
      baselineId: audit.baselineId,
      candidateId: audit.candidateId,
      componentDiffs: audit.componentDiffs,
      environmentDiffs: audit.environmentDiffs,
      releaseDecision: audit.releaseDecision,
      blockers: audit.blockers
    }))
    .digest("hex");

  return audit;
}

function generateSvgReport(audit) {
  const rows = [
    ["Components", audit.componentDiffs.filter((item) => item.changed).length, "#0f766e"],
    ["Env drift", audit.environmentDiffs.length, "#b45309"],
    ["Blockers", audit.blockers.length, "#be123c"]
  ];
  const bars = rows.map(([label, value, color], index) => {
    const y = 182 + index * 62;
    const width = 56 + value * 74;
    return `
      <text x="68" y="${y + 24}" fill="#334155" font-size="22" font-weight="700">${label}</text>
      <rect x="214" y="${y}" width="${width}" height="36" rx="9" fill="${color}" opacity="0.9"/>
      <text x="${236 + width}" y="${y + 25}" fill="#0f172a" font-size="20" font-weight="700">${value}</text>
    `;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <rect x="38" y="36" width="884" height="468" rx="22" fill="#ffffff" stroke="#dbe4ee"/>
  <text x="64" y="92" fill="#0f766e" font-family="Arial, sans-serif" font-size="18" font-weight="700">PROJECT REPOSITORY &amp; VERSION CONTROL</text>
  <text x="64" y="132" fill="#0f172a" font-family="Arial, sans-serif" font-size="34" font-weight="800">Environment Drift Gate</text>
  <text x="64" y="162" fill="#64748b" font-family="Arial, sans-serif" font-size="18">${escapeXml(audit.releaseDecision)} · ${audit.semanticVersionImpact} release impact · digest ${audit.auditDigest.slice(0, 12)}</text>
  <g font-family="Arial, sans-serif">${bars}</g>
  <rect x="64" y="402" width="832" height="64" rx="16" fill="#fff7ed" stroke="#fed7aa"/>
  <text x="88" y="438" fill="#9a3412" font-family="Arial, sans-serif" font-size="20" font-weight="700">Quarantine until environment hashes, LFS routing, and fresh reruns are resolved.</text>
</svg>`;
}

function renderReviewPacket(audit) {
  const tasks = audit.reviewerTasks.map((task) => `- ${task.type}: ${task.message}`).join("\n");
  return `# Repository Environment Drift Review Packet

Baseline: ${audit.baselineId}
Candidate: ${audit.candidateId}
Decision: ${audit.releaseDecision}
Semantic version impact: ${audit.semanticVersionImpact}
Digest: ${audit.auditDigest}

## Blockers

${audit.blockers.map((blocker) => `- ${blocker}`).join("\n")}

## Reviewer Tasks

${tasks}
`;
}

function writeDemoOutputs(audit, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "drift-audit.json"), JSON.stringify(audit, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, "environment-drift.svg"), generateSvgReport(audit));
  fs.writeFileSync(path.join(outputDir, "review-packet.md"), renderReviewPacket(audit));
}

function formatValue(value) {
  return Array.isArray(value) ? value.join(", ") || "none" : String(value);
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  auditRepositoryEnvironmentDrift,
  compareComponents,
  compareEnvironment,
  generateSvgReport,
  semanticVersionImpact,
  staleRerunDays,
  writeDemoOutputs
};
