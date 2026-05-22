function auditSubmissionPacket(packet) {
  const artifacts = new Map((packet.artifacts || []).map((artifact) => [artifact.id, artifact]));
  const blockers = [];
  const readySignals = [];
  const reviewerTasks = [];

  const ethicsText = normalizeText(packet.sections?.ethics);
  const dataText = normalizeText(packet.sections?.dataAvailability);
  const codeText = normalizeText(packet.sections?.codeAvailability);

  if (hasEthicsReview(ethicsText) && hasConsent(ethicsText, packet.participantGroups || [])) {
    readySignals.push("Ethics review and adult consent are present in the manuscript packet.");
  } else {
    blockers.push({
      code: "MISSING_ETHICS_CONSENT",
      severity: "hold",
      message: "Ethics approval and consent language must be explicit before review.",
    });
    reviewerTasks.push("Add explicit IRB/ethics approval and consent language for the participant group.");
  }

  if (dataText.includes("dryad") || dataText.includes("zenodo") || dataText.includes("osf")) {
    readySignals.push("Data availability statement names a repository or recognized deposit path.");
  } else if (dataText) {
    reviewerTasks.push("Strengthen the data availability statement with repository, embargo, or access terms.");
  } else {
    blockers.push({
      code: "MISSING_DATA_AVAILABILITY",
      severity: "hold",
      message: "Data availability statement is missing.",
    });
  }

  if (codeText.includes("repository") || codeText.includes("github") || codeText.includes("zenodo")) {
    readySignals.push("Code availability statement identifies a reviewable repository path.");
  } else if (codeText) {
    reviewerTasks.push("Add a concrete repository or archive location for the analysis code.");
  }

  for (const claim of packet.claims || []) {
    const evidence = (claim.evidenceIds || []).map((id) => artifacts.get(id)).filter(Boolean);
    const datasets = evidence.filter((artifact) => artifact.type === "dataset");
    const codeArtifacts = evidence.filter((artifact) => artifact.type === "analysis-code");

    if (claim.requiresData && datasets.length === 0) {
      blockers.push({
        code: "MISSING_DATA_EVIDENCE",
        severity: "hold",
        claimId: claim.id,
        message: `Claim ${claim.id} requires a dataset artifact.`,
      });
      reviewerTasks.push(`Attach dataset evidence for claim ${claim.id}: ${claim.text}`);
    }

    if (claim.requiresCode && codeArtifacts.length === 0) {
      blockers.push({
        code: "MISSING_CODE_EVIDENCE",
        severity: "revise",
        claimId: claim.id,
        message: `Claim ${claim.id} requires analysis-code evidence.`,
      });
      reviewerTasks.push(`Attach analysis-code evidence for claim ${claim.id}: ${claim.text}`);
    }

    for (const dataset of datasets) {
      if (isPrivateDataset(dataset) && !hasAvailabilityRoute(dataset)) {
        blockers.push({
          code: "PRIVATE_DATASET_WITHOUT_AVAILABILITY",
          severity: "revise",
          artifactId: dataset.id,
          message: `${dataset.label} is not public and lacks repository or controlled-access terms.`,
        });
        reviewerTasks.push(
          `Add a repository or controlled-access statement for ${dataset.label}.`,
        );
      }
    }
  }

  const status = blockers.some((blocker) => blocker.severity === "hold")
    ? "hold"
    : blockers.length > 0
      ? "revise"
      : "ready";

  if (status === "ready") {
    reviewerTasks.push("Confirm embargo dates and repository links before external submission.");
  }

  return {
    manuscriptId: packet.manuscriptId,
    title: packet.title,
    status,
    blockers,
    readySignals,
    reviewerTasks,
    auditDigest: buildAuditDigest(packet.manuscriptId, status, blockers, readySignals),
  };
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function hasEthicsReview(text) {
  return text.includes("irb") || text.includes("ethics") || text.includes("reviewed");
}

function hasConsent(text, participantGroups) {
  if (participantGroups.length === 0) return true;
  return text.includes("consent") || text.includes("assent") || text.includes("waiver");
}

function isPrivateDataset(dataset) {
  return ["private", "internal", "restricted"].includes(normalizeText(dataset.access));
}

function hasAvailabilityRoute(dataset) {
  return Boolean(
    normalizeText(dataset.repository) || normalizeText(dataset.availabilityStatement),
  );
}

function buildAuditDigest(manuscriptId, status, blockers, readySignals) {
  const blockerCodes = blockers.map((blocker) => blocker.code).sort().join("|") || "none";
  const signalCount = String(readySignals.length).padStart(2, "0");
  return `${manuscriptId}:${status}:${signalCount}:${blockerCodes}`;
}

module.exports = {
  auditSubmissionPacket,
};
