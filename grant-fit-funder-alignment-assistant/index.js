"use strict";

const IMPACT_TERMS = ["benefit", "improve", "reduce", "increase", "capacity", "community"];

function unique(values) {
  return [...new Set(values)];
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function scorePriorityCoverage(packet) {
  const searchable = normalizeText([
    packet.proposal.aims.join(" "),
    packet.proposal.impactStatement,
    packet.proposal.beneficiaries.join(" "),
    packet.proposal.artifacts.map((artifact) => artifact.name).join(" "),
  ].join(" "));

  const covered = [];
  const missing = [];

  for (const priority of packet.funder.priorities) {
    const terms = normalizeText(priority).split(/\s+/);
    const matched = terms.some((term) => searchable.includes(term));
    if (matched) covered.push(priority);
    else missing.push(priority);
  }

  return {
    score: packet.funder.priorities.length === 0 ? 0 : covered.length / packet.funder.priorities.length,
    covered,
    missing,
  };
}

function scoreOpenArtifactReadiness(packet) {
  const artifacts = packet.proposal.artifacts;
  const readyOpen = artifacts.filter((artifact) => artifact.open && artifact.status === "ready");
  const blockers = artifacts
    .filter((artifact) => !artifact.open || artifact.status !== "ready")
    .map((artifact) => `${artifact.name}: ${artifact.status}${artifact.open ? "" : ", closed"}`);

  return {
    score: artifacts.length === 0 ? 0 : readyOpen.length / artifacts.length,
    readyOpen: readyOpen.map((artifact) => artifact.name),
    blockers,
  };
}

function scoreBudgetFit(packet) {
  const total = packet.proposal.budgetLines.reduce((sum, line) => sum + line.amountUsd, 0);
  const missingJustification = packet.proposal.budgetLines
    .filter((line) => !normalizeText(line.justification))
    .map((line) => line.category);
  const overLimit = total > packet.funder.hardConstraints.maxBudgetUsd;
  const justificationPenalty = missingJustification.length / Math.max(packet.proposal.budgetLines.length, 1);
  const score = Math.max(0, (overLimit ? 0.35 : 1) - justificationPenalty * 0.3);

  return {
    score,
    total,
    limit: packet.funder.hardConstraints.maxBudgetUsd,
    overLimit,
    missingJustification,
  };
}

function scoreEthicsFit(packet) {
  const blockers = [];
  const ethics = packet.proposal.ethics;
  const constraints = packet.funder.hardConstraints;

  if (constraints.requiresHumanSubjectsPlan && !ethics.humanSubjects) {
    blockers.push("Human-subjects plan is required but not declared.");
  }
  if (constraints.requiresHumanSubjectsPlan && !normalizeText(ethics.irbStatus)) {
    blockers.push("IRB status is missing.");
  }
  if (constraints.requiresHumanSubjectsPlan && !normalizeText(ethics.consentPlan)) {
    blockers.push("Consent or waiver plan is missing.");
  }
  if (!normalizeText(ethics.dataProtectionPlan)) {
    blockers.push("Data protection plan is missing.");
  }

  const conditionalApproval = normalizeText(ethics.irbStatus).includes("conditional");
  const score = Math.max(0, 1 - blockers.length * 0.3 - (conditionalApproval ? 0.15 : 0));

  return {
    score,
    blockers,
    advisory: conditionalApproval ? "Clarify the conditions required before award activation." : "",
  };
}

function scoreEvidenceGrounding(packet) {
  const evidenceIds = new Set(packet.proposal.evidenceLibrary.map((entry) => entry.id));
  const unsupported = [];
  const missingReferences = [];

  for (const entry of packet.proposal.evidenceClaims) {
    if (!normalizeText(entry.evidenceId)) {
      unsupported.push(entry.claim);
    } else if (!evidenceIds.has(entry.evidenceId)) {
      missingReferences.push(`${entry.claim} -> ${entry.evidenceId}`);
    }
  }

  const invalidCount = unsupported.length + missingReferences.length;
  const score = Math.max(0, 1 - invalidCount / Math.max(packet.proposal.evidenceClaims.length, 1));

  return {
    score,
    unsupported,
    missingReferences,
  };
}

function scoreImpactClarity(packet) {
  const impact = normalizeText(packet.proposal.impactStatement);
  const hasBeneficiaries = packet.proposal.beneficiaries.length > 0;
  const termHits = unique(IMPACT_TERMS.filter((term) => impact.includes(term)));
  const score = Math.min(1, termHits.length / 3 + (hasBeneficiaries ? 0.25 : 0));

  return {
    score,
    termHits,
    beneficiaries: packet.proposal.beneficiaries,
  };
}

function buildActionItems(sections) {
  const items = [];

  if (sections.priority.missing.length > 0) {
    items.push(`Add explicit links to funder priorities: ${sections.priority.missing.join(", ")}.`);
  }
  if (sections.artifacts.blockers.length > 0) {
    items.push(`Move artifact blockers to ready/open status: ${sections.artifacts.blockers.join("; ")}.`);
  }
  if (sections.budget.overLimit) {
    items.push(`Reduce budget below USD ${sections.budget.limit.toLocaleString("en-US")}.`);
  }
  if (sections.budget.missingJustification.length > 0) {
    items.push(`Add budget justification for: ${sections.budget.missingJustification.join(", ")}.`);
  }
  if (sections.ethics.blockers.length > 0) {
    items.push(...sections.ethics.blockers);
  }
  if (sections.ethics.advisory) {
    items.push(sections.ethics.advisory);
  }
  if (sections.evidence.unsupported.length > 0) {
    items.push(`Attach evidence IDs to unsupported claims: ${sections.evidence.unsupported.join("; ")}.`);
  }
  if (sections.evidence.missingReferences.length > 0) {
    items.push(`Fix missing evidence references: ${sections.evidence.missingReferences.join("; ")}.`);
  }

  return unique(items);
}

function createReviewerPacket(packet) {
  const sections = {
    priority: scorePriorityCoverage(packet),
    artifacts: scoreOpenArtifactReadiness(packet),
    budget: scoreBudgetFit(packet),
    ethics: scoreEthicsFit(packet),
    evidence: scoreEvidenceGrounding(packet),
    impact: scoreImpactClarity(packet),
  };

  const weights = {
    priority: 0.24,
    artifacts: 0.18,
    budget: 0.16,
    ethics: 0.18,
    evidence: 0.16,
    impact: 0.08,
  };

  const weightedScore = Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + sections[key].score * weight;
  }, 0);

  const actionItems = buildActionItems(sections);
  const status = weightedScore >= 0.82 && actionItems.length <= 2 ? "review-ready" : "needs-revision";

  return {
    projectTitle: packet.projectTitle,
    funder: packet.funder.name,
    status,
    weightedScore: Number(weightedScore.toFixed(3)),
    sections,
    actionItems,
    reviewerSummary: [
      `${packet.projectTitle} is ${status} for ${packet.funder.name}.`,
      `Priority coverage: ${sections.priority.covered.length}/${packet.funder.priorities.length}.`,
      `Open artifact readiness: ${sections.artifacts.readyOpen.length}/${packet.proposal.artifacts.length}.`,
      `Budget request: USD ${sections.budget.total.toLocaleString("en-US")} of USD ${sections.budget.limit.toLocaleString("en-US")}.`,
    ],
  };
}

module.exports = {
  createReviewerPacket,
  scorePriorityCoverage,
  scoreOpenArtifactReadiness,
  scoreBudgetFit,
  scoreEthicsFit,
  scoreEvidenceGrounding,
  scoreImpactClarity,
};
