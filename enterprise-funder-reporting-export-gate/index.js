const crypto = require("crypto");

const DEFAULT_DESTINATIONS = {
  nih: ["pubmed-central", "institutional-repository"],
  horizon: ["zenodo", "institutional-repository"],
  ukri: ["institutional-repository", "zenodo"],
  internal: ["institutional-repository"],
};

const REQUIRED_ARTIFACTS = ["manuscript", "dataset", "code", "metadata"];

const sampleProjects = [
  {
    id: "proj-ready-neuro-001",
    title: "Open electrophysiology reproducibility pack",
    funder: "nih",
    mandateId: "NIH-OS-2026-15",
    openAccess: true,
    reproducibilityScore: 0.92,
    embargoUntil: null,
    destinations: ["pubmed-central", "institutional-repository"],
    orcidCoverage: 1,
    doiReserved: true,
    dataUseAgreement: true,
    artifacts: {
      manuscript: { sha256: "a3b1", license: "cc-by-4.0" },
      dataset: { sha256: "b4c2", license: "cc0-1.0" },
      code: { sha256: "c5d3", license: "mit" },
      metadata: { sha256: "d6e4", license: "cc0-1.0" },
    },
  },
  {
    id: "proj-embargo-gap-002",
    title: "Clinical cohort embargo exception",
    funder: "horizon",
    mandateId: "HE-OPEN-2026-44",
    openAccess: false,
    reproducibilityScore: 0.86,
    embargoUntil: "2026-08-01",
    destinations: ["zenodo"],
    orcidCoverage: 0.83,
    doiReserved: true,
    dataUseAgreement: true,
    artifacts: {
      manuscript: { sha256: "f7g5", license: "cc-by-4.0" },
      dataset: { sha256: "g8h6", license: "restricted" },
      code: { sha256: "h9i7", license: "apache-2.0" },
      metadata: { sha256: "i1j8", license: "cc0-1.0" },
    },
  },
  {
    id: "proj-low-repro-003",
    title: "Protein fold benchmark notebook",
    funder: "ukri",
    mandateId: "UKRI-FAIR-2026-09",
    openAccess: true,
    reproducibilityScore: 0.58,
    embargoUntil: null,
    destinations: ["institutional-repository"],
    orcidCoverage: 0.95,
    doiReserved: false,
    dataUseAgreement: true,
    artifacts: {
      manuscript: { sha256: "j2k9", license: "cc-by-4.0" },
      dataset: { sha256: "k3l0", license: "cc-by-4.0" },
      code: { sha256: "l4m1", license: "mit" },
      metadata: { sha256: "m5n2", license: "cc0-1.0" },
    },
  },
];

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function getSupportedDestinations(funder, destinations = DEFAULT_DESTINATIONS) {
  return destinations[funder] || destinations.internal;
}

function chooseDestination(project, destinations = DEFAULT_DESTINATIONS) {
  const supported = getSupportedDestinations(project.funder, destinations);
  const selected = project.destinations.find((destination) =>
    supported.includes(destination),
  );

  return selected || null;
}

function collectBlockers(project, options = {}) {
  const minReproducibilityScore = options.minReproducibilityScore ?? 0.8;
  const blockers = [];
  const warnings = [];

  if (!project.mandateId) {
    blockers.push("Missing funder mandate identifier.");
  }

  if (!project.openAccess) {
    if (project.embargoUntil) {
      warnings.push(`Open access delayed by embargo until ${project.embargoUntil}.`);
    } else {
      blockers.push("Open access requirement is not satisfied.");
    }
  }

  if (project.reproducibilityScore < minReproducibilityScore) {
    blockers.push(
      `Reproducibility score ${project.reproducibilityScore} is below ${minReproducibilityScore}.`,
    );
  }

  for (const artifact of REQUIRED_ARTIFACTS) {
    if (!project.artifacts[artifact]?.sha256) {
      blockers.push(`Missing ${artifact} artifact hash.`);
    }
  }

  if (project.orcidCoverage < 0.9) {
    warnings.push("ORCID coverage is below institutional reporting target.");
  }

  if (!project.doiReserved) {
    warnings.push("DOI has not been reserved yet.");
  }

  if (!project.dataUseAgreement) {
    blockers.push("Missing data-use agreement evidence.");
  }

  if (!chooseDestination(project, options.destinations)) {
    blockers.push(`No supported export destination for funder ${project.funder}.`);
  }

  return { blockers, warnings };
}

function buildExportPacket(project, options = {}) {
  const destination = chooseDestination(project, options.destinations);
  const artifactManifest = REQUIRED_ARTIFACTS.map((artifact) => ({
    type: artifact,
    sha256: project.artifacts[artifact]?.sha256 || null,
    license: project.artifacts[artifact]?.license || null,
  }));
  const packet = {
    projectId: project.id,
    title: project.title,
    funder: project.funder,
    mandateId: project.mandateId,
    destination,
    openAccess: project.openAccess,
    reproducibilityScore: project.reproducibilityScore,
    artifacts: artifactManifest,
    reportingVersion: "2026.05",
  };

  return {
    ...packet,
    evidenceDigest: digest(packet),
  };
}

function buildWebhookEvent(project, gateResult) {
  const event = {
    type: "enterprise.funder_export_gate.evaluated",
    projectId: project.id,
    status: gateResult.status,
    destination: gateResult.exportPacket.destination,
    blockerCount: gateResult.blockers.length,
    warningCount: gateResult.warnings.length,
    evidenceDigest: gateResult.exportPacket.evidenceDigest,
  };

  return {
    ...event,
    signature: digest(event),
  };
}

function evaluateProject(project, options = {}) {
  const { blockers, warnings } = collectBlockers(project, options);
  const exportPacket = buildExportPacket(project, options);
  const result = {
    projectId: project.id,
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers,
    warnings,
    exportPacket,
  };

  return {
    ...result,
    webhookEvent: buildWebhookEvent(project, result),
  };
}

function evaluatePortfolio(projects, options = {}) {
  const results = projects.map((project) => evaluateProject(project, options));
  const ready = results.filter((result) => result.status === "ready").length;
  const blocked = results.length - ready;

  return {
    ready,
    blocked,
    total: results.length,
    results,
    portfolioDigest: digest(results.map((result) => result.webhookEvent)),
  };
}

module.exports = {
  DEFAULT_DESTINATIONS,
  REQUIRED_ARTIFACTS,
  sampleProjects,
  stableJson,
  digest,
  getSupportedDestinations,
  chooseDestination,
  collectBlockers,
  buildExportPacket,
  buildWebhookEvent,
  evaluateProject,
  evaluatePortfolio,
};
