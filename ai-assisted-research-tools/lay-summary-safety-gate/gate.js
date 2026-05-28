"use strict";

const CAUSAL_TERMS = ["causes", "caused", "proves", "prevents", "cures", "guarantees"];
const BENEFIT_TERMS = ["safe treatment", "effective treatment", "clinically proven", "will help patients"];
const UNCERTAINTY_TERMS = ["may", "might", "associated", "confidence interval", "uncertain", "pilot", "preliminary"];

function reviewSummaryPackets(packets) {
  return packets.map(reviewSummaryPacket);
}

function reviewSummaryPacket(packet) {
  validatePacket(packet);

  const findings = [
    ...reviewUnsupportedClaims(packet),
    ...reviewUncertainty(packet),
    ...reviewTerms(packet),
    ...reviewScope(packet),
  ];

  return {
    manuscriptId: packet.manuscriptId,
    audience: packet.audience,
    decision: findings.some((item) => item.severity === "block") ? "block" : "ready",
    findings,
    receipt: buildReceipt(packet, findings),
  };
}

function validatePacket(packet) {
  if (!packet.manuscriptId || !packet.source || !packet.summary) {
    throw new Error("Summary packet must include manuscriptId, source, and summary.");
  }
  if (!Array.isArray(packet.requiredTerms)) {
    throw new Error(`${packet.manuscriptId} must include requiredTerms.`);
  }
}

function reviewUnsupportedClaims(packet) {
  const findings = [];
  const summary = normalize(packet.summary);
  const source = normalize(packet.source);

  for (const term of CAUSAL_TERMS) {
    if (summary.includes(term) && !source.includes(term) && !packet.allowedClaims?.includes(term)) {
      findings.push(
        finding(
          "unsupported_causal_language",
          "block",
          term,
          `Lay summary uses '${term}' without source support.`,
          "Rewrite the explanation with association or uncertainty language.",
        ),
      );
    }
  }

  for (const term of BENEFIT_TERMS) {
    if (summary.includes(term) && !source.includes(term) && !packet.allowedClaims?.includes(term)) {
      findings.push(
        finding(
          "unsupported_benefit_language",
          "block",
          term,
          `Lay summary claims '${term}' without clinical support in the source.`,
          "Remove clinical benefit wording or cite a source-backed outcome.",
        ),
      );
    }
  }

  return findings;
}

function reviewUncertainty(packet) {
  const source = normalize(packet.source);
  const summary = normalize(packet.summary);
  const sourceHasUncertainty = UNCERTAINTY_TERMS.some((term) => source.includes(term));
  const summaryHasUncertainty = UNCERTAINTY_TERMS.some((term) => summary.includes(term));

  if (sourceHasUncertainty && !summaryHasUncertainty) {
    return [
      finding(
        "missing_uncertainty",
        "block",
        "summary",
        "Source includes uncertainty or preliminary evidence, but the lay summary removes it.",
        "Add plain-language uncertainty, such as 'early evidence suggests' or 'may be associated'.",
      ),
    ];
  }

  return [];
}

function reviewTerms(packet) {
  const summary = normalize(packet.summary);
  return packet.requiredTerms.flatMap((term) => {
    const normalizedTerm = normalize(term.term);
    const explanation = normalize(term.explanation);
    const mentionsTerm = summary.includes(normalizedTerm);
    const explainsTerm = explanation && summary.includes(explanation);

    if (mentionsTerm && !explainsTerm) {
      return [
        finding(
          "unexplained_term",
          "hold",
          term.term,
          `Lay summary mentions '${term.term}' without the required plain-language explanation.`,
          "Add the approved plain-language explanation or remove the technical term.",
        ),
      ];
    }

    return [];
  });
}

function reviewScope(packet) {
  const findings = [];
  const summary = normalize(packet.summary);
  for (const rule of packet.scopeRules ?? []) {
    if (summary.includes(normalize(rule.forbiddenPhrase))) {
      findings.push(
        finding(
          "scope_broadening",
          "block",
          rule.forbiddenPhrase,
          `Lay summary broadens scope with '${rule.forbiddenPhrase}'.`,
          `Keep the claim limited to ${rule.allowedScope}.`,
        ),
      );
    }
  }
  return findings;
}

function buildReceipt(packet, findings) {
  return {
    requiredTerms: packet.requiredTerms.length,
    blockedFindings: findings.filter((item) => item.severity === "block").length,
    heldFindings: findings.filter((item) => item.severity === "hold").length,
    nextActions: Array.from(new Set(findings.map((item) => item.action))),
  };
}

function finding(code, severity, target, message, action) {
  return { code, severity, target, message, action };
}

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function summarizeReports(reports) {
  return reports.reduce(
    (summary, report) => {
      summary.total += 1;
      summary.ready += report.decision === "ready" ? 1 : 0;
      summary.blocked += report.decision === "block" ? 1 : 0;
      summary.findings += report.findings.length;
      return summary;
    },
    { total: 0, ready: 0, blocked: 0, findings: 0 },
  );
}

module.exports = {
  reviewSummaryPacket,
  reviewSummaryPackets,
  summarizeReports,
};
