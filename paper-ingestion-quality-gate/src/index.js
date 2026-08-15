"use strict";

const REQUIRED_SECTIONS = ["abstract", "methods", "results", "discussion"];
const REQUIRED_EXTRACTION_KEYS = [
  "textLayer",
  "sectionMap",
  "tableMap",
  "figureCaptionMap",
  "referenceMap",
  "extractionDigest"
];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function normalizePacket(packet) {
  return {
    id: packet.id,
    title: packet.title || "Untitled AI summarizer intake packet",
    source: packet.source || {},
    extraction: packet.extraction || {},
    expected: packet.expected || {},
    summarizer: packet.summarizer || {},
    provenance: packet.provenance || {}
  };
}

function percent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function missingRequiredSections(packet) {
  const present = new Set(list(packet.extraction.sectionsPresent).map(normalizeText));
  return REQUIRED_SECTIONS.filter((section) => !present.has(section));
}

function missingProvenance(packet) {
  return REQUIRED_EXTRACTION_KEYS.filter((key) => packet.provenance[key] !== true);
}

function pageDropCount(packet) {
  return Math.max(0, Number(packet.source.pageCount || 0) - Number(packet.extraction.pagesExtracted || 0));
}

function extractionCompleteness(packet) {
  const sourcePages = Math.max(1, Number(packet.source.pageCount || 0));
  const pages = Number(packet.extraction.pagesExtracted || 0) / sourcePages;
  const text = percent(packet.extraction.textCoverage);
  const tablesExpected = Math.max(0, Number(packet.expected.tables || 0));
  const tablesExtracted = Number(packet.extraction.tablesExtracted || 0);
  const tables = tablesExpected === 0 ? 1 : tablesExtracted / tablesExpected;
  const referencesExpected = Math.max(0, Number(packet.expected.references || 0));
  const referencesParsed = Number(packet.extraction.referencesParsed || 0);
  const references = referencesExpected === 0 ? 1 : referencesParsed / referencesExpected;
  return Math.max(0, Math.min(1, (pages + text + Math.min(1, tables) + Math.min(1, references)) / 4));
}

function hasSevereEncodingNoise(packet) {
  return percent(packet.extraction.unrecognizedGlyphRate) > 0.04 || percent(packet.extraction.ocrConfidence) < 0.72;
}

function analyzePacket(input) {
  const packet = normalizePacket(input);
  const findings = [];
  const missingSections = missingRequiredSections(packet);
  const droppedPages = pageDropCount(packet);
  const completeness = extractionCompleteness(packet);
  const missingProv = missingProvenance(packet);

  if (droppedPages > 0) {
    findings.push(finding(
      "PDF_PAGE_DROP_DETECTED",
      droppedPages >= 2 ? "critical" : "major",
      "The source paper has pages that were not extracted.",
      {
        pageCount: Number(packet.source.pageCount || 0),
        pagesExtracted: Number(packet.extraction.pagesExtracted || 0),
        droppedPages
      },
      "Block summarization until the paper is reprocessed and every page has extraction evidence."
    ));
  }

  if (missingSections.length > 0) {
    findings.push(finding(
      "REQUIRED_SECTION_MISSING",
      missingSections.includes("methods") || missingSections.includes("results") ? "critical" : "major",
      "Required scientific sections are missing from the extracted text map.",
      { missingSections },
      "Re-run section segmentation or require manual section confirmation before summary generation."
    ));
  }

  if (hasSevereEncodingNoise(packet)) {
    findings.push(finding(
      "OCR_OR_ENCODING_QUALITY_LOW",
      "critical",
      "OCR confidence or glyph quality is too poor for a reliable AI-generated summary.",
      {
        ocrConfidence: percent(packet.extraction.ocrConfidence),
        unrecognizedGlyphRate: percent(packet.extraction.unrecognizedGlyphRate)
      },
      "Use a higher-quality text layer or route to manual intake review before summarization."
    ));
  }

  const expectedTables = Number(packet.expected.tables || 0);
  const extractedTables = Number(packet.extraction.tablesExtracted || 0);
  if (expectedTables > extractedTables) {
    findings.push(finding(
      "TABLE_EXTRACTION_INCOMPLETE",
      expectedTables - extractedTables >= 2 ? "critical" : "major",
      "One or more expected tables were not extracted for summarizer grounding.",
      { expectedTables, extractedTables },
      "Hold key-finding and numeric-summary generation until table extraction is complete."
    ));
  }

  const expectedFigures = Number(packet.expected.figures || 0);
  const extractedCaptions = Number(packet.extraction.figureCaptionsExtracted || 0);
  if (expectedFigures > extractedCaptions) {
    findings.push(finding(
      "FIGURE_CAPTION_MAP_INCOMPLETE",
      "major",
      "Figure captions are missing from the summarizer intake packet.",
      { expectedFigures, extractedCaptions },
      "Regenerate figure-caption anchors or suppress figure-derived claims from the summary."
    ));
  }

  const expectedReferences = Number(packet.expected.references || 0);
  const parsedReferences = Number(packet.extraction.referencesParsed || 0);
  if (expectedReferences > 0 && parsedReferences / expectedReferences < 0.8) {
    findings.push(finding(
      "REFERENCE_PARSE_COVERAGE_LOW",
      "major",
      "Reference parsing coverage is too low for reliable related-work or implication summaries.",
      { expectedReferences, parsedReferences },
      "Suppress citation-based implication bullets until reference parsing is repaired."
    ));
  }

  if (percent(packet.extraction.equationCoverage) < percent(packet.expected.minEquationCoverage || 0.9)) {
    findings.push(finding(
      "EQUATION_EXTRACTION_COVERAGE_LOW",
      "major",
      "Equation extraction coverage is below the configured summarizer threshold.",
      {
        equationCoverage: percent(packet.extraction.equationCoverage),
        minEquationCoverage: percent(packet.expected.minEquationCoverage || 0.9)
      },
      "Warn reviewers and avoid mathematical-method summaries until equation extraction is confirmed."
    ));
  }

  if (missingProv.length > 0) {
    findings.push(finding(
      "EXTRACTION_PROVENANCE_INCOMPLETE",
      "major",
      "The intake packet lacks required extraction provenance flags.",
      { missingProvenance: missingProv },
      "Attach text, section, table, figure, reference, and digest evidence before releasing AI summaries."
    ));
  }

  if (completeness < 0.78) {
    findings.push(finding(
      "INTAKE_COMPLETENESS_BELOW_THRESHOLD",
      "critical",
      "Overall source extraction completeness is below the AI summarizer safety threshold.",
      { completeness: Number(completeness.toFixed(3)) },
      "Hold summarization and regenerate the intake packet from the source document."
    ));
  }

  if (
    findings.length > 0 &&
    packet.summarizer.generateKeyFindings === true &&
    packet.summarizer.requireCleanIntake !== true
  ) {
    findings.push(finding(
      "SUMMARIZER_NOT_GATED_ON_CLEAN_INTAKE",
      "critical",
      "AI key-finding generation is enabled while source-ingestion quality findings are unresolved.",
      {
        generateKeyFindings: packet.summarizer.generateKeyFindings,
        requireCleanIntake: packet.summarizer.requireCleanIntake || false
      },
      "Require clean intake status before generating key findings, implications, or next steps."
    ));
  }

  const decision = decisionFor(findings);
  return {
    id: packet.id,
    title: packet.title,
    decision,
    completeness: Number(completeness.toFixed(3)),
    findings,
    recommendedActions: buildRecommendedActions(decision, findings)
  };
}

function decisionFor(findings) {
  if (findings.some((item) => item.severity === "critical")) return "HOLD";
  if (findings.some((item) => item.severity === "major")) return "REVIEW";
  return "SUMMARIZE";
}

function buildRecommendedActions(decision, findings) {
  if (decision === "SUMMARIZE") {
    return ["Allow AI summarization with normal extraction provenance attached."];
  }

  const actions = [
    "Attach the intake findings to the AI summarizer queue.",
    "Regenerate extraction artifacts before key findings or implications are generated.",
    "Show reviewers which source sections, tables, figures, or references are unsafe."
  ];

  if (findings.some((item) => item.code === "SUMMARIZER_NOT_GATED_ON_CLEAN_INTAKE")) {
    actions.unshift("Disable key-finding generation until intake quality is clean.");
  }

  return actions;
}

function analyzeIngestionPackets(packets) {
  const results = list(packets).map(analyzePacket);
  const counts = results.reduce((acc, item) => {
    acc[item.decision] = (acc[item.decision] || 0) + 1;
    return acc;
  }, { SUMMARIZE: 0, REVIEW: 0, HOLD: 0 });

  return {
    generatedAt: new Date().toISOString(),
    totalPackets: results.length,
    counts,
    results
  };
}

module.exports = {
  analyzePacket,
  analyzeIngestionPackets,
  extractionCompleteness,
  missingRequiredSections,
  pageDropCount
};
