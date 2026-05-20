"use strict";

const DEFAULT_RULES = {
  requiredCaptionWords: 5,
  weakClaimWords: ["significant", "improved", "higher", "lower", "correlates"],
  requiredEvidenceTypes: ["figure", "table"],
};

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toLookup(items) {
  return new Map(items.map((item) => [item.id.toLowerCase(), item]));
}

function findReferences(text) {
  const references = [];
  const pattern = /\b(?:fig(?:ure)?|table)\s*\.?\s*([a-z]?\d+[a-z]?)/gi;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0].replace(/\s+/g, " ");
    const prefix = raw.toLowerCase().startsWith("table") ? "table" : "figure";
    references.push({
      label: `${prefix} ${match[1].toLowerCase()}`,
      raw,
      index: match.index,
    });
  }

  return references;
}

function sentenceSplit(text) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function scoreClaimRisk(sentence, references) {
  const lowered = sentence.toLowerCase();
  let score = references.length === 0 ? 2 : 0;

  for (const word of DEFAULT_RULES.weakClaimWords) {
    if (lowered.includes(word)) score += 1;
  }

  if (/\bp\s*[<=>]\s*0?\.\d+/i.test(sentence) && !/\b(ci|confidence interval)\b/i.test(sentence)) {
    score += 2;
  }

  if (/\b\d+(?:\.\d+)?\s*%/.test(sentence) && !references.length) {
    score += 1;
  }

  return score;
}

function auditManuscript(manuscript, options = {}) {
  const rules = { ...DEFAULT_RULES, ...options };
  const figures = toLookup(manuscript.figures || []);
  const tables = toLookup(manuscript.tables || []);
  const evidenceItems = [...figures.values(), ...tables.values()];
  const findings = [];
  const citationActions = [];
  const summaryEvidence = [];

  const body = normalizeText(manuscript.body);
  const sentences = sentenceSplit(body);
  const usedEvidence = new Set();

  for (const sentence of sentences) {
    const refs = findReferences(sentence);
    const missingRefs = refs.filter((ref) => {
      const lookup = ref.label.startsWith("table") ? tables : figures;
      return !lookup.has(ref.label);
    });

    for (const ref of refs) usedEvidence.add(ref.label);

    if (missingRefs.length) {
      findings.push({
        severity: "high",
        code: "missing-evidence-reference",
        message: `Claim references ${missingRefs.map((ref) => ref.raw).join(", ")} but no matching figure/table is present.`,
        sentence,
        action: "Add the missing artifact or rewrite the claim to cite available evidence.",
      });
    }

    const risk = scoreClaimRisk(sentence, refs);
    if (risk >= 3) {
      findings.push({
        severity: refs.length ? "medium" : "high",
        code: refs.length ? "claim-needs-stronger-statistical-context" : "quantified-claim-without-evidence",
        message: refs.length
          ? "Statistical or comparative claim needs confidence interval, sample size, or clearer evidence context."
          : "Quantified or comparative claim has no figure/table reference.",
        sentence,
        action: refs.length
          ? "Attach the statistic to a specific panel/table cell and include uncertainty where available."
          : "Link the claim to a figure/table or soften it as an observation.",
      });
    }
  }

  for (const item of evidenceItems) {
    const id = item.id.toLowerCase();
    const caption = normalizeText(item.caption);
    if (!usedEvidence.has(id)) {
      findings.push({
        severity: "medium",
        code: "unused-evidence-artifact",
        message: `${item.id} is present but not cited in the manuscript body.`,
        artifact: item.id,
        action: "Cite it where it supports a claim, or remove it from the submission packet.",
      });
    }

    if (caption.split(/\s+/).filter(Boolean).length < rules.requiredCaptionWords) {
      findings.push({
        severity: "medium",
        code: "caption-too-thin",
        message: `${item.id} caption is too short for reviewer-ready context.`,
        artifact: item.id,
        action: "Expand the caption with measurement, cohort, time window, and unit details.",
      });
    }

    if (item.unit && !body.toLowerCase().includes(String(item.unit).toLowerCase())) {
      findings.push({
        severity: "low",
        code: "unit-not-mentioned-in-body",
        message: `${item.id} uses unit '${item.unit}' but that unit is not mentioned near the manuscript claims.`,
        artifact: item.id,
        action: "Mention the unit in the related claim or caption to reduce reviewer ambiguity.",
      });
    }
  }

  for (const citation of manuscript.candidateCitations || []) {
    const supports = evidenceItems.some((item) => {
      const haystack = `${item.caption} ${item.tags || ""}`.toLowerCase();
      return citation.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
    });

    citationActions.push({
      id: citation.id,
      title: citation.title,
      recommendation: supports ? "insert" : "defer",
      reason: supports
        ? "Matches evidence artifact tags or captions."
        : "No direct figure/table evidence match in this draft packet.",
    });
  }

  for (const item of evidenceItems) {
    summaryEvidence.push({
      id: item.id,
      caption: normalizeText(item.caption),
      cited: usedEvidence.has(item.id.toLowerCase()),
      reviewerCue: item.tags ? `Evidence tags: ${item.tags}` : "No evidence tags supplied.",
    });
  }

  const high = findings.filter((finding) => finding.severity === "high").length;
  const medium = findings.filter((finding) => finding.severity === "medium").length;
  const readiness =
    high > 0 ? "hold-for-author-fix" : medium > 2 ? "needs-reviewer-sweep" : "ready-for-human-review";

  return {
    manuscriptId: manuscript.id,
    title: manuscript.title,
    summaryModes: {
      abstract: `${manuscript.title}: ${summaryEvidence.length} evidence artifacts checked; ${findings.length} review actions generated.`,
      executive: `${readiness} with ${high} high and ${medium} medium priority evidence issues.`,
      layperson: high
        ? "Some strong claims point to missing or unclear figures/tables, so the draft should be fixed before review."
        : "The draft mostly connects its claims to supporting figures and tables.",
    },
    readiness,
    findings,
    citationActions,
    summaryEvidence,
    auditDigest: buildDigest(manuscript.id, findings, citationActions),
  };
}

function buildDigest(manuscriptId, findings, citationActions) {
  const payload = [
    manuscriptId,
    ...findings.map((finding) => `${finding.severity}:${finding.code}:${finding.artifact || ""}`),
    ...citationActions.map((action) => `${action.id}:${action.recommendation}`),
  ].join("|");

  let hash = 0;
  for (let index = 0; index < payload.length; index += 1) {
    hash = (hash * 31 + payload.charCodeAt(index)) >>> 0;
  }
  return `fta-${hash.toString(16).padStart(8, "0")}`;
}

module.exports = {
  auditManuscript,
  findReferences,
  scoreClaimRisk,
};
