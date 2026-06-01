const crypto = require("node:crypto");

const ABSTRACT_SECTIONS = new Set(["title", "abstract", "summary", "lay_summary"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function severityRank(severity) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 0;
}

function addFinding(findings, severity, code, message, refs, action) {
  findings.push({
    severity,
    code,
    message,
    refs: asArray(refs),
    action
  });
}

function evaluateTerminologyPacket(packet) {
  const findings = [];
  const terms = asArray(packet.terms);
  const citations = asArray(packet.citationRecommendations);
  const summaries = asArray(packet.generatedSummaries);
  const termById = new Map(terms.map((term) => [term.id, term]));
  const acronymGroups = new Map();

  for (const term of terms) {
    if (!term.id) {
      addFinding(findings, "high", "TERM_MISSING_ID", "A terminology entry is missing a stable id.", [], "assign_term_id");
      continue;
    }

    const short = String(term.short || "").trim();
    if (short) {
      if (!acronymGroups.has(short.toUpperCase())) {
        acronymGroups.set(short.toUpperCase(), []);
      }
      acronymGroups.get(short.toUpperCase()).push(term);
    }

    if (short && term.expandedAtFirstUse !== true) {
      const severity = ABSTRACT_SECTIONS.has(term.firstUseSection) ? "high" : "medium";
      addFinding(
        findings,
        severity,
        "ACRONYM_NOT_EXPANDED_AT_FIRST_USE",
        `${short} is not expanded at first use in ${term.firstUseSection || "an unknown section"}.`,
        [term.id],
        "expand_acronym_at_first_use"
      );
    }

    if (term.requiresDefinition && !String(term.definition || "").trim()) {
      addFinding(
        findings,
        ABSTRACT_SECTIONS.has(term.firstUseSection) ? "high" : "medium",
        "TERM_DEFINITION_MISSING",
        `${term.label || term.id} requires a reviewer-facing definition before AI summaries or citation suggestions use it.`,
        [term.id],
        "add_reviewer_facing_definition"
      );
    }

    if (term.audience === "lay" && term.jargonLevel === "high" && !term.layDefinition) {
      addFinding(
        findings,
        "medium",
        "LAY_DEFINITION_MISSING",
        `${term.label || term.id} appears in a lay-facing packet without a lay definition.`,
        [term.id],
        "add_lay_definition_or_remove_from_lay_summary"
      );
    }

    const observedForms = new Set(asArray(term.observedForms).map(normalize).filter(Boolean));
    const preferred = normalize(term.preferredForm || term.label);
    if (preferred && observedForms.size > 1 && !observedForms.has(preferred)) {
      addFinding(
        findings,
        "medium",
        "PREFERRED_TERM_FORM_ABSENT",
        `${term.label || term.id} has multiple observed forms but none match the preferred nomenclature.`,
        [term.id],
        "normalize_term_to_preferred_form"
      );
    }

    if (term.expectedStyle && term.observedStyle && term.expectedStyle !== term.observedStyle) {
      addFinding(
        findings,
        "medium",
        "NOMENCLATURE_STYLE_MISMATCH",
        `${term.label || term.id} uses ${term.observedStyle} style where ${term.expectedStyle} style is expected.`,
        [term.id],
        "fix_domain_nomenclature_style"
      );
    }
  }

  for (const [short, group] of acronymGroups.entries()) {
    const expansions = new Set(group.map((term) => normalize(term.expansion)).filter(Boolean));
    if (expansions.size > 1) {
      addFinding(
        findings,
        "high",
        "ACRONYM_EXPANSION_CONFLICT",
        `${short} maps to ${expansions.size} different expansions in the manuscript packet.`,
        group.map((term) => term.id),
        "resolve_acronym_expansion_conflict"
      );
    }
  }

  for (const citation of citations) {
    const term = termById.get(citation.termId);
    if (!term) {
      addFinding(
        findings,
        "medium",
        "CITATION_TERM_UNKNOWN",
        `Citation recommendation ${citation.id || "unknown"} references an unknown terminology id.`,
        [citation.id],
        "bind_citation_to_known_term"
      );
      continue;
    }
    if (term.requiresDefinition && !String(term.definition || "").trim()) {
      addFinding(
        findings,
        "medium",
        "CITATION_BEFORE_TERM_DEFINITION",
        `Citation recommendation ${citation.id || "unknown"} uses ${term.label || term.id} before the term is defined.`,
        [citation.id, term.id],
        "define_term_before_citation_insertion"
      );
    }
  }

  for (const summary of summaries) {
    for (const termId of asArray(summary.termIds)) {
      const term = termById.get(termId);
      if (!term) {
        continue;
      }
      if (summary.mode === "layperson" && (term.jargonLevel === "high" || term.audience === "expert") && !term.layDefinition) {
        addFinding(
          findings,
          "high",
          "LAY_SUMMARY_JARGON_UNEXPLAINED",
          `Generated layperson summary ${summary.id || "unknown"} includes ${term.label || term.id} without an accessible definition.`,
          [summary.id, term.id],
          "rewrite_lay_summary_with_definition"
        );
      }
    }
  }

  findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code));
  const decision = findings.some((finding) => severityRank(finding.severity) >= 3)
    ? "hold_ai_research_packet"
    : findings.some((finding) => finding.severity === "medium")
      ? "revise_terminology_packet"
      : "release_ai_research_packet";

  const coverage = terms.map((term) => ({
    id: term.id,
    label: term.label,
    short: term.short || null,
    firstUseSection: term.firstUseSection || null,
    hasDefinition: Boolean(String(term.definition || "").trim()),
    hasLayDefinition: Boolean(term.layDefinition),
    observedForms: asArray(term.observedForms)
  }));

  const summary = {
    manuscriptId: packet.manuscriptId,
    decision,
    termsReviewed: terms.length,
    citationRecommendationsReviewed: citations.length,
    generatedSummariesReviewed: summaries.length,
    findingCount: findings.length,
    highOrCriticalFindings: findings.filter((finding) => severityRank(finding.severity) >= 3).length
  };
  const auditDigest = `sha256:${sha256({ summary, findings, coverage }).slice(0, 16)}`;

  return {
    summary: {
      ...summary,
      auditDigest
    },
    coverage,
    findings,
    actions: buildActions(findings)
  };
}

function buildActions(findings) {
  const seen = new Set();
  const actions = [];
  for (const finding of findings) {
    if (!finding.action || seen.has(finding.action)) {
      continue;
    }
    seen.add(finding.action);
    actions.push({
      id: finding.action,
      severity: finding.severity,
      refs: finding.refs
    });
  }
  return actions;
}

function renderMarkdownReport(packet, evaluation) {
  const lines = [];
  lines.push(`# Manuscript Terminology Definition Review: ${packet.manuscriptId}`);
  lines.push("");
  lines.push(`Decision: **${evaluation.summary.decision}**`);
  lines.push(`Audit digest: \`${evaluation.summary.auditDigest}\``);
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (evaluation.findings.length === 0) {
    lines.push("No terminology blockers were detected.");
  } else {
    lines.push("| Severity | Code | Message | Action |");
    lines.push("| --- | --- | --- | --- |");
    for (const finding of evaluation.findings) {
      lines.push(`| ${finding.severity} | \`${finding.code}\` | ${escapeMarkdown(finding.message)} | \`${finding.action}\` |`);
    }
  }
  lines.push("");
  lines.push("## Term Coverage");
  lines.push("");
  lines.push("| Term | Short | Section | Definition | Lay definition | Observed forms |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const item of evaluation.coverage) {
    lines.push(`| ${item.label || item.id} | ${item.short || ""} | ${item.firstUseSection || ""} | ${item.hasDefinition ? "yes" : "no"} | ${item.hasLayDefinition ? "yes" : "no"} | ${item.observedForms.join(", ")} |`);
  }
  lines.push("");
  lines.push("Synthetic data only. No uploaded manuscripts, private corpora, citation indexes, external AI APIs, credentials, or payment systems are used.");
  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(evaluation) {
  const color = evaluation.summary.decision === "hold_ai_research_packet" ? "#b91c1c" : evaluation.summary.decision === "revise_terminology_packet" ? "#b45309" : "#047857";
  const rows = evaluation.findings.slice(0, 5).map((finding, index) => {
    const y = 304 + index * 42;
    return `<text x="76" y="${y}" font-family="Arial, sans-serif" font-size="22" fill="#111827">${escapeXml(finding.severity.toUpperCase())} ${escapeXml(finding.code)}</text>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="Manuscript terminology definition assistant summary">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="48" y="44" width="1184" height="632" rx="18" fill="#ffffff" stroke="#d1d5db" stroke-width="2"/>
  <text x="76" y="110" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#111827">Terminology Definition Assistant</text>
  <rect x="76" y="140" width="560" height="58" rx="10" fill="${color}"/>
  <text x="102" y="178" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${escapeXml(evaluation.summary.decision)}</text>
  <text x="76" y="242" font-family="Arial, sans-serif" font-size="24" fill="#374151">Terms reviewed: ${evaluation.summary.termsReviewed}</text>
  <text x="76" y="276" font-family="Arial, sans-serif" font-size="24" fill="#374151">Findings: ${evaluation.summary.findingCount}</text>
${rows || '<text x="76" y="304" font-family="Arial, sans-serif" font-size="22" fill="#047857">No findings detected.</text>'}
  <text x="76" y="642" font-family="Arial, sans-serif" font-size="20" fill="#6b7280">${escapeXml(evaluation.summary.auditDigest)}</text>
</svg>
`;
}

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  evaluateTerminologyPacket,
  renderMarkdownReport,
  renderSvgSummary,
  sha256
};
