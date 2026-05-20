"use strict";

const LICENSE_RULES = {
  "Apache-2.0": { commercial: true, attribution: true, copyleft: false, redistribution: true },
  MIT: { commercial: true, attribution: true, copyleft: false, redistribution: true },
  "CC-BY-4.0": { commercial: true, attribution: true, copyleft: false, redistribution: true },
  "CC-BY-NC-4.0": { commercial: false, attribution: true, copyleft: false, redistribution: true },
  "GPL-3.0": { commercial: true, attribution: true, copyleft: true, redistribution: true },
  Proprietary: { commercial: false, attribution: true, copyleft: false, redistribution: false },
};

function ruleFor(license) {
  const rule = LICENSE_RULES[license];
  if (!rule) {
    throw new Error(`Unsupported license in release manifest: ${license}`);
  }
  return rule;
}

function evaluateArtifact(artifact, manifest) {
  const rule = ruleFor(artifact.license);
  const holds = [];

  if (manifest.releaseIntent.includes("commercial") && !rule.commercial) {
    holds.push("commercial-use-blocked");
  }
  if (rule.attribution && !String(artifact.attribution || "").trim()) {
    holds.push("missing-attribution");
  }
  if (!rule.redistribution) {
    holds.push("redistribution-blocked");
  }
  if (rule.copyleft && manifest.targetLicense !== artifact.license) {
    holds.push("copyleft-target-license-conflict");
  }
  if (!String(artifact.sourceUrl || "").trim()) {
    holds.push("missing-source-url");
  }

  return {
    artifactId: artifact.id,
    name: artifact.name,
    type: artifact.type,
    license: artifact.license,
    status: holds.length === 0 ? "release-ready" : "blocked",
    holds,
    remediation: holds.map(remediationForHold),
  };
}

function remediationForHold(hold) {
  const remediations = {
    "commercial-use-blocked": "Replace, relicense, or exclude non-commercial artifacts from commercial releases.",
    "missing-attribution": "Add required attribution before publication.",
    "redistribution-blocked": "Remove proprietary artifact or attach redistribution permission.",
    "copyleft-target-license-conflict": "Isolate GPL artifact or align the release target license with copyleft obligations.",
    "missing-source-url": "Attach a DOI, repository URL, or storage URI for provenance review.",
  };
  return remediations[hold] || "Review manually.";
}

function createLicenseCompatibilityPacket(manifest) {
  const evaluations = manifest.artifacts.map((artifact) => evaluateArtifact(artifact, manifest));
  const blockedArtifacts = evaluations.filter((artifact) => artifact.status === "blocked");
  const releaseStatus = blockedArtifacts.length === 0 ? "release-ready" : "blocked";
  const licenseMix = [...new Set(manifest.artifacts.map((artifact) => artifact.license))].sort();

  return {
    releaseId: manifest.releaseId,
    releaseIntent: manifest.releaseIntent,
    targetLicense: manifest.targetLicense,
    releaseStatus,
    licenseMix,
    readyArtifacts: evaluations.filter((artifact) => artifact.status === "release-ready").map((artifact) => artifact.artifactId),
    blockedArtifacts: blockedArtifacts.map((artifact) => artifact.artifactId),
    evaluations,
    policyReceipt: {
      checkedRules: Object.keys(LICENSE_RULES).sort(),
      releaseBlockingSignals: [...new Set(blockedArtifacts.flatMap((artifact) => artifact.holds))].sort(),
    },
  };
}

module.exports = {
  createLicenseCompatibilityPacket,
  evaluateArtifact,
  ruleFor,
  LICENSE_RULES,
};
