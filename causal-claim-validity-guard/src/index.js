"use strict";

const CAUSAL_TERMS = [
  "cause",
  "causes",
  "caused",
  "causal",
  "effect of",
  "leads to",
  "resulted in",
  "prevents",
  "reduces",
  "increases",
  "drives",
  "improves",
  "protects against"
];

const CAUSAL_DESIGNS = new Set([
  "randomized_controlled_trial",
  "quasi_experimental",
  "instrumental_variable",
  "regression_discontinuity",
  "difference_in_differences",
  "natural_experiment"
]);

function includesCausalLanguage(value) {
  const text = String(value || "").toLowerCase();
  return CAUSAL_TERMS.some((term) => text.includes(term));
}

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function severityWeight(severity) {
  if (severity === "critical") return 5;
  if (severity === "major") return 3;
  return 1;
}

function decisionFromFindings(findings) {
  const score = findings.reduce((total, item) => total + severityWeight(item.severity), 0);
  const critical = findings.some((item) => item.severity === "critical");
  const major = findings.filter((item) => item.severity === "major").length;
  if (critical || major >= 2 || score >= 7) return "HOLD";
  if (major >= 1 || score >= 2) return "REVISE";
  return "RELEASE";
}

function confidenceFromFindings(findings) {
  const penalty = findings.reduce((total, item) => total + severityWeight(item.severity), 0);
  return Math.max(0.15, Number((0.95 - penalty * 0.08).toFixed(2)));
}

function normalizePacket(packet) {
  return {
    id: packet.id,
    title: packet.title,
    domain: packet.domain || "general science",
    claim: packet.claim || {},
    evidence: packet.evidence || {},
    conclusion: packet.conclusion || "",
    reviewerContext: packet.reviewerContext || {}
  };
}

function analyzePacket(input) {
  const packet = normalizePacket(input);
  const claimText = packet.claim.text || "";
  const conclusion = packet.conclusion || "";
  const evidence = packet.evidence;
  const design = evidence.design || "unspecified";
  const causalIntent = packet.claim.intent === "causal" || includesCausalLanguage(claimText);
  const conclusionCausal = includesCausalLanguage(conclusion);
  const findings = [];

  if (causalIntent && !CAUSAL_DESIGNS.has(design)) {
    findings.push(finding(
      "DESIGN_CANNOT_SUPPORT_CAUSAL_LANGUAGE",
      design === "cross_sectional" || design === "case_series" ? "critical" : "major",
      "The manuscript uses causal language, but the stated design does not independently support causal inference.",
      { design, claim: claimText },
      "Replace causal verbs with associational language or add a causal identification strategy with assumptions and diagnostics."
    ));
  }

  if ((causalIntent || conclusionCausal) && evidence.hasComparator !== true) {
    findings.push(finding(
      "MISSING_COMPARATOR",
      "major",
      "Causal review requires a comparator, control, counterfactual, or explicit quasi-experimental contrast.",
      { hasComparator: evidence.hasComparator },
      "Add a comparator/control description and explain why it approximates the counterfactual."
    ));
  }

  if ((causalIntent || conclusionCausal) && evidence.temporalOrder !== true) {
    findings.push(finding(
      "TEMPORAL_ORDER_GAP",
      "major",
      "The evidence packet does not show that exposure or intervention preceded the outcome.",
      { temporalOrder: evidence.temporalOrder },
      "Document timing of exposure, intervention, measurement, and outcome windows."
    ));
  }

  if ((causalIntent || conclusionCausal) && !evidence.confounderStrategy) {
    findings.push(finding(
      "CONFOUNDER_STRATEGY_MISSING",
      "major",
      "No confounder strategy is described for a causal claim.",
      { confounderStrategy: evidence.confounderStrategy || null },
      "Describe randomization, matching, adjustment, stratification, sensitivity analysis, or a defensible natural experiment."
    ));
  }

  if ((causalIntent || conclusionCausal) && evidence.effectSize && !evidence.confidenceInterval) {
    findings.push(finding(
      "UNCERTAINTY_NOT_REPORTED",
      "minor",
      "The packet reports an effect size without an uncertainty interval.",
      { effectSize: evidence.effectSize, confidenceInterval: evidence.confidenceInterval || null },
      "Add confidence, credible, or bootstrap intervals and specify the estimation method."
    ));
  }

  if (packet.claim.intent === "associational" && conclusionCausal) {
    findings.push(finding(
      "CONCLUSION_OVERSTATES_ASSOCIATION",
      "major",
      "The claim is labeled associational but the conclusion uses causal wording.",
      { intent: packet.claim.intent, conclusion },
      "Align the conclusion with the claim intent or provide a causal design and evidence upgrade."
    ));
  }

  if (Array.isArray(evidence.subgroups) && evidence.subgroups.some((group) => group.powered !== true && includesCausalLanguage(group.claim))) {
    findings.push(finding(
      "UNDERPOWERED_SUBGROUP_CAUSAL_CLAIM",
      "minor",
      "At least one subgroup claim uses causal language without a powered subgroup analysis.",
      { subgroups: evidence.subgroups },
      "Mark subgroup findings exploratory unless power and multiplicity controls are documented."
    ));
  }

  const decision = decisionFromFindings(findings);
  return {
    id: packet.id,
    title: packet.title,
    domain: packet.domain,
    decision,
    confidence: confidenceFromFindings(findings),
    causalLanguageDetected: causalIntent || conclusionCausal,
    findingCount: findings.length,
    findings,
    reviewerNote: reviewerNote(packet, decision, findings)
  };
}

function reviewerNote(packet, decision, findings) {
  if (decision === "RELEASE") {
    return `${packet.domain}: causal wording is aligned with the study design and evidence packet.`;
  }
  const first = findings[0];
  return `${packet.domain}: ${decision} before release because ${first.message.toLowerCase()}`;
}

function analyzePackets(packets) {
  const reviews = packets.map(analyzePacket);
  const counts = reviews.reduce((acc, review) => {
    acc[review.decision] = (acc[review.decision] || 0) + 1;
    return acc;
  }, {});
  return {
    generatedAt: new Date().toISOString(),
    packetCount: reviews.length,
    decisionCounts: {
      RELEASE: counts.RELEASE || 0,
      REVISE: counts.REVISE || 0,
      HOLD: counts.HOLD || 0
    },
    reviews
  };
}

module.exports = {
  CAUSAL_TERMS,
  CAUSAL_DESIGNS,
  analyzePacket,
  analyzePackets,
  includesCausalLanguage
};
