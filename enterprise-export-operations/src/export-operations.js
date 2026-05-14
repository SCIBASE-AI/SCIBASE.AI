import { createHash } from "node:crypto";

const TARGETS = Object.freeze({
  zenodo: {
    label: "Zenodo",
    requiredFiles: ["metadata.json", "manuscript/main.md", "data/README.md"],
    metadataStandard: "DataCite JSON",
    webhookTopic: "export.zenodo.package.ready"
  },
  pubmedCentral: {
    label: "PubMed Central",
    requiredFiles: ["manuscript/main.md", "figures/figure-1.png", "metadata.json"],
    metadataStandard: "JATS-ready manifest",
    webhookTopic: "export.pmc.package.ready"
  },
  funderReport: {
    label: "Funder Reporting Portal",
    requiredFiles: ["metadata.json", "compliance/open-access.json", "compliance/reproducibility.json"],
    metadataStandard: "Funder compliance JSON",
    webhookTopic: "export.funder.package.ready"
  }
});

function hashJson(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function percent(numerator, denominator) {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

export function listExportTargets() {
  return Object.entries(TARGETS).map(([key, target]) => ({ key, ...target }));
}

export function buildAdminDashboard(institution) {
  const projectCount = institution.projects.length;
  const publicCount = institution.projects.filter((project) => project.visibility === "public").length;
  const compliantCount = institution.projects.filter(
    (project) => project.compliance.openAccess && project.compliance.reproducibilityScore >= 80
  ).length;
  const storageGb = institution.projects.reduce((sum, project) => sum + project.storageGb, 0);
  const exportQueue = institution.projects.flatMap((project) => project.exportRequests);
  const labs = institution.projects.reduce((acc, project) => {
    acc.set(project.lab, (acc.get(project.lab) ?? 0) + 1);
    return acc;
  }, new Map());

  return {
    institutionId: institution.id,
    institutionName: institution.name,
    projectCount,
    publicProjectRate: percent(publicCount, projectCount),
    openScienceComplianceRate: percent(compliantCount, projectCount),
    storageGb,
    exportQueue: {
      requested: exportQueue.length,
      ready: exportQueue.filter((request) => request.status === "ready").length,
      blocked: exportQueue.filter((request) => request.status === "blocked").length
    },
    topLabs: [...labs.entries()]
      .map(([lab, projects]) => ({ lab, projects }))
      .sort((a, b) => b.projects - a.projects || a.lab.localeCompare(b.lab))
  };
}

export function buildExportPackage(project, targetKey) {
  const target = TARGETS[targetKey];
  if (!target) throw new Error(`Unsupported export target: ${targetKey}`);

  const missingFiles = target.requiredFiles.filter((file) => !project.files.includes(file));
  const packageManifest = {
    packageId: `${project.id}-${targetKey}-${project.version}`,
    target: target.label,
    metadataStandard: target.metadataStandard,
    project: {
      id: project.id,
      title: project.title,
      version: project.version,
      doi: project.doi,
      authors: project.authors
    },
    files: target.requiredFiles.map((path) => ({
      path,
      available: project.files.includes(path),
      sha256: project.fileHashes[path] ?? null
    })),
    compliance: {
      openAccess: project.compliance.openAccess,
      funderMandate: project.compliance.funderMandate,
      reproducibilityScore: project.compliance.reproducibilityScore,
      missingFiles
    },
    ready: missingFiles.length === 0 && project.compliance.reproducibilityScore >= 70
  };

  return {
    ...packageManifest,
    packageHash: hashJson(packageManifest)
  };
}

export function buildComplianceManifest(institution) {
  const packages = institution.projects.flatMap((project) =>
    project.exportRequests.map((request) => buildExportPackage(project, request.target))
  );
  return {
    institutionId: institution.id,
    generatedFor: institution.name,
    packages,
    summary: {
      total: packages.length,
      ready: packages.filter((pkg) => pkg.ready).length,
      blocked: packages.filter((pkg) => !pkg.ready).length
    }
  };
}

export function buildWebhookEvents(institution) {
  return buildComplianceManifest(institution).packages.map((pkg) => {
    const targetKey = Object.keys(TARGETS).find((key) => TARGETS[key].label === pkg.target);
    const payload = {
      packageId: pkg.packageId,
      institutionId: institution.id,
      ready: pkg.ready,
      packageHash: pkg.packageHash
    };
    return {
      id: `evt_${hashJson(payload).slice(0, 18)}`,
      topic: TARGETS[targetKey].webhookTopic,
      idempotencyKey: `${pkg.packageId}:${pkg.packageHash.slice(0, 12)}`,
      payload
    };
  });
}

export function listApiCatalog() {
  return [
    { method: "GET", path: "/enterprise/dashboard", description: "Institution-wide admin metrics" },
    { method: "GET", path: "/enterprise/exports/targets", description: "Supported external export targets" },
    { method: "POST", path: "/enterprise/exports/package", description: "Build a target-specific export package manifest" },
    { method: "GET", path: "/enterprise/compliance", description: "Compliance and readiness manifest" },
    { method: "GET", path: "/enterprise/webhooks/events", description: "Webhook delivery event preview" }
  ];
}

export function listFormattingPlugins() {
  return [
    { key: "jats-lite", output: "JATS XML", targets: ["pubmedCentral"], preserves: ["doi", "orcid", "figures"] },
    { key: "datacite-json", output: "DataCite JSON", targets: ["zenodo"], preserves: ["doi", "funding", "license"] },
    { key: "funder-evidence", output: "Compliance JSON", targets: ["funderReport"], preserves: ["mandate", "access", "reproducibility"] }
  ];
}
