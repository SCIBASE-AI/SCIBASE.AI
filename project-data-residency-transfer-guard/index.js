const crypto = require("crypto");

const SENSITIVE_CLASSIFICATIONS = new Set([
  "restricted-human-genomic",
  "clinical-derived-sensitive",
  "controlled-dataset",
  "embargoed-artifact",
]);

function isSensitive(classification) {
  return SENSITIVE_CLASSIFICATIONS.has(String(classification || "").toLowerCase());
}

function isCrossRegion(scenario) {
  return scenario.project.homeRegion !== scenario.request.destinationRegion;
}

function stableDigest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function daysUntil(dateText, now = new Date("2026-05-29T00:00:00Z")) {
  if (!dateText) return 0;
  const target = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function evaluateScenario(scenario) {
  const findings = [];
  const sensitive = isSensitive(scenario.request.targetClassification);
  const crossRegion = isCrossRegion(scenario);
  const externalInstitution =
    scenario.project.homeInstitution !== scenario.request.actorInstitution;

  if (sensitive && crossRegion && scenario.evidence.dpaStatus !== "approved") {
    findings.push({
      severity: "blocker",
      code: "missing-cross-region-dpa",
      message: "Sensitive project data cannot cross residency boundaries without an approved DPA.",
    });
  }

  if (sensitive && scenario.evidence.duaStatus === "expired") {
    findings.push({
      severity: "blocker",
      code: "expired-data-use-agreement",
      message: "The data-use agreement is expired for the requested transfer.",
    });
  }

  const embargoDays = daysUntil(scenario.evidence.exportEmbargoUntil);
  if (embargoDays > 0) {
    findings.push({
      severity: "blocker",
      code: "active-export-embargo",
      message: `Export embargo remains active for ${embargoDays} day(s).`,
    });
  }

  if (externalInstitution && !scenario.evidence.externalPartnerAllowed) {
    findings.push({
      severity: "blocker",
      code: "external-partner-not-allowed",
      message: "Project policy does not allow this external partner transfer.",
    });
  }

  if (!scenario.evidence.collaboratorAffiliationVerified) {
    findings.push({
      severity: "review",
      code: "unverified-affiliation",
      message: "Collaborator affiliation must be verified before access is granted.",
    });
  }

  if (sensitive && !scenario.evidence.dataStewardApproval) {
    findings.push({
      severity: "review",
      code: "missing-data-steward-approval",
      message: "Sensitive object access requires data-steward approval evidence.",
    });
  }

  if (scenario.project.visibility === "public" && !sensitive && findings.length === 0) {
    findings.push({
      severity: "info",
      code: "public-metadata-safe",
      message: "Public non-sensitive metadata transfer is allowed with current evidence.",
    });
  }

  const blockers = findings.filter((finding) => finding.severity === "blocker");
  const reviewItems = findings.filter((finding) => finding.severity === "review");
  const decision = blockers.length ? "blocked" : reviewItems.length ? "needs_review" : "approved";

  return {
    id: scenario.id,
    projectId: scenario.project.id,
    action: scenario.request.action,
    targetObject: scenario.request.targetObject,
    classification: scenario.request.targetClassification,
    homeRegion: scenario.project.homeRegion,
    destinationRegion: scenario.request.destinationRegion,
    crossRegion,
    externalInstitution,
    decision,
    findings,
    auditDigest: stableDigest({
      scenario,
      decision,
      findingCodes: findings.map((finding) => finding.code),
    }),
  };
}

function evaluateResidencyTransfers(scenarios) {
  const decisions = scenarios.map(evaluateScenario);
  const summary = decisions.reduce(
    (acc, decision) => {
      acc.total += 1;
      acc[decision.decision] += 1;
      acc.findingCount += decision.findings.length;
      return acc;
    },
    { total: 0, approved: 0, needs_review: 0, blocked: 0, findingCount: 0 }
  );

  return {
    generatedAt: "2026-05-29T00:00:00.000Z",
    guard: "project-data-residency-transfer-guard",
    summary,
    decisions,
    reportDigest: stableDigest({ summary, decisions }),
  };
}

module.exports = {
  evaluateResidencyTransfers,
  evaluateScenario,
  isSensitive,
  isCrossRegion,
};
