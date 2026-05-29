function mapEvidence(evidenceItems) {
  return new Map(evidenceItems.map((item) => [item.id, item]));
}

function evaluateClaim(claim, evidenceById) {
  const linkedEvidence = claim.evidenceRefs.map((ref) => evidenceById.get(ref)).filter(Boolean);
  const availableSignals = new Set(linkedEvidence.flatMap((item) => item.signals));
  const missingSignals = claim.requiredSignals.filter((signal) => !availableSignals.has(signal));
  const missingRefs = claim.evidenceRefs.filter((ref) => !evidenceById.has(ref));
  const findings = [];

  if (missingRefs.length > 0) {
    findings.push(`missing evidence references: ${missingRefs.join(", ")}`);
  }
  if (missingSignals.length > 0) {
    findings.push(`missing required signals: ${missingSignals.join(", ")}`);
  }
  if (claim.type === "overclaim" && linkedEvidence.some((item) => /residual|subset|remained/i.test(item.summary))) {
    findings.push("claim wording is stronger than the linked evidence");
  }
  if (claim.type === "novelty" && missingSignals.includes("scope-limitation")) {
    findings.push("novelty claim needs a narrower scope limitation");
  }

  let decision = "supported";
  if (missingRefs.length > 0 || missingSignals.length >= 2) {
    decision = "missing-evidence";
  } else if (claim.type === "overclaim" || findings.some((finding) => finding.includes("stronger"))) {
    decision = "overclaimed";
  } else if (missingSignals.length === 1) {
    decision = "weakly-supported";
  }

  const actions = {
    supported: ["keep claim with evidence links"],
    "weakly-supported": ["add missing evidence signal or soften claim"],
    overclaimed: ["soften absolute wording", "add precise limitation"],
    "missing-evidence": ["block release until required evidence is attached"]
  }[decision];

  return {
    id: claim.id,
    text: claim.text,
    decision,
    evidenceRefs: claim.evidenceRefs,
    linkedEvidence: linkedEvidence.map((item) => item.label),
    missingSignals,
    findings,
    actions
  };
}

function evaluateManuscript(manuscript) {
  const evidenceById = mapEvidence(manuscript.evidence);
  const claims = manuscript.claims.map((claim) => evaluateClaim(claim, evidenceById));
  const summary = claims.reduce(
    (acc, claim) => {
      acc.total += 1;
      acc[claim.decision] = (acc[claim.decision] || 0) + 1;
      acc.findingCount += claim.findings.length;
      return acc;
    },
    { total: 0, findingCount: 0 }
  );

  return {
    manuscriptId: manuscript.id,
    title: manuscript.title,
    generatedAt: manuscript.generatedAt,
    summary,
    claims
  };
}

module.exports = { evaluateClaim, evaluateManuscript };
