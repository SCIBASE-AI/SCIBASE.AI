function evaluateNotebook(packet) {
  const blockers = [];
  const warnings = [];

  if (!packet.environmentDigest) blockers.push("missing environment digest");
  if (!packet.randomSeedPinned) blockers.push("random seed is not pinned");
  if (!packet.rawDataDigest) blockers.push("missing raw data digest");
  if (!packet.outputDigest) blockers.push("missing output digest");
  if (packet.baselineOutputDigest && packet.outputDigest && packet.baselineOutputDigest !== packet.outputDigest) {
    blockers.push("output digest changed from baseline");
  }
  if (packet.numericDrift > packet.allowedDrift) blockers.push("numeric drift exceeds allowed tolerance");
  if (packet.missingFigures > 0) blockers.push("expected figures are missing");
  if (packet.rerunMinutes > packet.maxRerunMinutes) warnings.push("rerun is slower than expected");
  if (!packet.provenanceAttached) warnings.push("provenance bundle is missing");

  let decision = "PUBLISH_REPRODUCIBLE";
  if (blockers.length) {
    decision = "HOLD_RELEASE";
  } else if (warnings.length) {
    decision = "REVIEW_BEFORE_RELEASE";
  }

  return {
    notebookId: packet.id,
    title: packet.title,
    decision,
    blockers,
    warnings,
    nextStep: nextStepFor(decision),
  };
}

function nextStepFor(decision) {
  if (decision === "PUBLISH_REPRODUCIBLE") return "publish the rerun badge and output manifest";
  if (decision === "REVIEW_BEFORE_RELEASE") return "ask a reviewer to approve the reproducibility packet";
  return "hold the notebook until the rerun packet matches the baseline";
}

function evaluateNotebooks(packets) {
  return packets.map(evaluateNotebook);
}

function renderMarkdownReport(results) {
  const lines = ["# Notebook rerun determinism report", ""];
  for (const result of results) {
    lines.push(`## ${result.notebookId}: ${result.title}`);
    lines.push(`Decision: ${result.decision}`);
    lines.push(`Next step: ${result.nextStep}`);
    if (result.blockers.length) {
      lines.push("Blockers:");
      for (const blocker of result.blockers) lines.push(`- ${blocker}`);
    }
    if (result.warnings.length) {
      lines.push("Warnings:");
      for (const warning of result.warnings) lines.push(`- ${warning}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

module.exports = {
  evaluateNotebook,
  evaluateNotebooks,
  renderMarkdownReport,
};
