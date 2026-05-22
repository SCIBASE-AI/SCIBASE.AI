"use strict";

const crypto = require("node:crypto");

const UNIT_DEFINITIONS = [
  { pattern: "cells/well", canonical: "cells/well", family: "count_density", scale: 1 },
  { pattern: "pg/mL", canonical: "pg/mL", family: "mass_concentration", scale: 1e-9 },
  { pattern: "ng/mL", canonical: "ng/mL", family: "mass_concentration", scale: 1e-6 },
  { pattern: "ug/mL", canonical: "ug/mL", family: "mass_concentration", scale: 1e-3 },
  { pattern: "microg/mL", canonical: "ug/mL", family: "mass_concentration", scale: 1e-3 },
  { pattern: "mg/mL", canonical: "mg/mL", family: "mass_concentration", scale: 1 },
  { pattern: "g/L", canonical: "mg/mL", family: "mass_concentration", scale: 1 },
  { pattern: "nM", canonical: "nM", family: "molar_concentration", scale: 1e-9 },
  { pattern: "uM", canonical: "uM", family: "molar_concentration", scale: 1e-6 },
  { pattern: "microM", canonical: "uM", family: "molar_concentration", scale: 1e-6 },
  { pattern: "mM", canonical: "mM", family: "molar_concentration", scale: 1e-3 },
  { pattern: "M", canonical: "M", family: "molar_concentration", scale: 1 },
  { pattern: "kg", canonical: "kg", family: "mass", scale: 1000 },
  { pattern: "mg", canonical: "mg", family: "mass", scale: 1e-3 },
  { pattern: "ug", canonical: "ug", family: "mass", scale: 1e-6 },
  { pattern: "microg", canonical: "ug", family: "mass", scale: 1e-6 },
  { pattern: "g", canonical: "g", family: "mass", scale: 1 },
  { pattern: "uL", canonical: "uL", family: "volume", scale: 1e-6 },
  { pattern: "microL", canonical: "uL", family: "volume", scale: 1e-6 },
  { pattern: "mL", canonical: "mL", family: "volume", scale: 1e-3 },
  { pattern: "L", canonical: "L", family: "volume", scale: 1 },
  { pattern: "hrs", canonical: "h", family: "time", scale: 3600 },
  { pattern: "hr", canonical: "h", family: "time", scale: 3600 },
  { pattern: "h", canonical: "h", family: "time", scale: 3600 },
  { pattern: "min", canonical: "min", family: "time", scale: 60 },
  { pattern: "sec", canonical: "s", family: "time", scale: 1 },
  { pattern: "s", canonical: "s", family: "time", scale: 1 },
  { pattern: "degC", canonical: "C", family: "temperature", scale: 1 },
  { pattern: "C", canonical: "C", family: "temperature", scale: 1 },
  { pattern: "rpm", canonical: "rpm", family: "rotation", scale: 1 },
  { pattern: "rcf", canonical: "rcf", family: "rotation", scale: 1 },
  { pattern: "xg", canonical: "xg", family: "rotation", scale: 1 },
  { pattern: "%", canonical: "%", family: "percent", scale: 1 },
];

const UNIT_BY_PATTERN = new Map(
  UNIT_DEFINITIONS.map((definition) => [definition.pattern.toLowerCase(), definition])
);

const UNIT_PATTERN = UNIT_DEFINITIONS.map((definition) => escapeRegExp(definition.pattern))
  .sort((a, b) => b.length - a.length)
  .join("|")
  .replace(/xg/g, "x\\s*g");

const MEASUREMENT_RE = new RegExp(
  String.raw`(-?\d+(?:,\d{3})*(?:\.\d+)?)\s*(${UNIT_PATTERN})(?![A-Za-z/])`,
  "gi"
);

const MISSING_UNIT_RE = /\b(?:at|to|by|from|around|about|approximately|approx\.?|reported|centrifuged at|heated to|increased by|decreased by)\s+(-?\d+(?:,\d{3})*(?:\.\d+)?)(?![\d,.])(?!\s*(?:%|[A-Za-z]+\/[A-Za-z]+|pg\/mL|ng\/mL|ug\/mL|microg\/mL|mg\/mL|g\/L|nM|uM|microM|mM|M|kg|mg|ug|microg|g|uL|microL|mL|L|hrs?|h|min|sec|s|degC|C|rpm|rcf|x\s*g|cells\/well|fold|times|participants|subjects|samples|replicates|wells|plates|groups|days|weeks|months|years)\b)/gi;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "of",
  "on",
  "or",
  "the",
  "then",
  "to",
  "was",
  "were",
  "with",
]);

function analyzeManuscript(packet) {
  const safePacket = packet || {};
  const trackedTerms = (safePacket.trackedTerms || []).map((term) => normalizeTrackedTerm(term));
  const sections = (safePacket.sections || []).map((section, sectionIndex) => ({
    id: section.id || `section-${sectionIndex + 1}`,
    title: section.title || `Section ${sectionIndex + 1}`,
    text: section.text || "",
  }));
  const tables = safePacket.tables || [];

  const measurements = [
    ...extractSectionMeasurements(sections, trackedTerms),
    ...extractTableMeasurements(tables, trackedTerms),
  ];

  const findings = [
    ...detectMissingUnits(sections),
    ...detectRangeOutliers(measurements),
    ...detectTrackedTermUnitDrift(measurements, trackedTerms),
    ...detectTableUnitDrift(tables, trackedTerms),
  ];

  const dedupedFindings = dedupeFindings(findings);
  const reviewerActions = buildReviewerActions(dedupedFindings);
  const score = calculateReadinessScore(dedupedFindings);
  const summary = {
    manuscriptId: safePacket.manuscriptId || "unknown-manuscript",
    title: safePacket.title || "Untitled manuscript",
    sectionsReviewed: sections.length,
    tablesReviewed: tables.length,
    measurementsReviewed: measurements.length,
    findingsBySeverity: countBy(dedupedFindings, "severity"),
    readinessScore: score,
    readiness: score >= 85 ? "ready-with-minor-edits" : score >= 65 ? "needs-targeted-revision" : "block-before-submission",
  };

  const result = {
    tool: "manuscript-unit-consistency-assistant",
    version: "1.0.0",
    summary,
    findings: dedupedFindings,
    reviewerActions,
    measurementInventory: measurements,
  };

  return {
    ...result,
    auditDigest: digestFor(result),
  };
}

function extractSectionMeasurements(sections, trackedTerms) {
  return sections.flatMap((section) => {
    const text = section.text || "";
    const matches = [];
    for (const match of text.matchAll(MEASUREMENT_RE)) {
      const unit = normalizeUnit(match[2]);
      if (!unit) {
        continue;
      }
      const rawValue = Number.parseFloat(match[1].replace(/,/g, ""));
      const windowText = text.slice(Math.max(0, match.index - 90), Math.min(text.length, match.index + 90));
      const sentenceText = compactWhitespace(sentenceAround(text, match.index).text);
      matches.push({
        id: stableId("measurement", section.id, match.index, match[0]),
        sourceType: "section",
        sourceId: section.id,
        sourceTitle: section.title,
        raw: match[0],
        value: rawValue,
        unit: unit.canonical,
        unitFamily: unit.family,
        normalizedValue: normalizeValue(rawValue, unit),
        subject: inferSectionSubject(text, match.index, trackedTerms),
        context: sentenceText || compactWhitespace(windowText),
      });
    }
    return matches;
  });
}

function extractTableMeasurements(tables, trackedTerms) {
  const measurements = [];
  tables.forEach((table, tableIndex) => {
    const tableId = table.id || `table-${tableIndex + 1}`;
    const columns = table.columns || [];
    const rows = table.rows || [];
    rows.forEach((row, rowIndex) => {
      columns.forEach((column, columnIndex) => {
        const cellValue = String(row[columnIndex] ?? "");
        for (const match of cellValue.matchAll(MEASUREMENT_RE)) {
          const unit = normalizeUnit(match[2]);
          if (!unit) {
            continue;
          }
          const rawValue = Number.parseFloat(match[1].replace(/,/g, ""));
          const context = `${table.title || tableId}: ${column.name || column} = ${cellValue}`;
          measurements.push({
            id: stableId("table-measurement", tableId, rowIndex, columnIndex, match[0]),
            sourceType: "table",
            sourceId: tableId,
            sourceTitle: table.title || tableId,
            row: rowIndex + 1,
            column: column.name || String(column),
            raw: match[0],
            value: rawValue,
            unit: unit.canonical,
            unitFamily: unit.family,
            normalizedValue: normalizeValue(rawValue, unit),
            subject: inferSubject(`${column.name || column} ${cellValue}`, trackedTerms),
            context,
          });
        }
      });
    });
  });
  return measurements;
}

function detectMissingUnits(sections) {
  const findings = [];
  sections.forEach((section) => {
    const text = section.text || "";
    for (const match of text.matchAll(MISSING_UNIT_RE)) {
      const value = Number.parseFloat(match[1].replace(/,/g, ""));
      if (Number.isNaN(value)) {
        continue;
      }
      const context = compactWhitespace(sentenceAround(text, match.index).text);
      if (looksLikeCitationOrStatistic(context)) {
        continue;
      }
      findings.push({
        id: stableId("missing-unit", section.id, match.index, match[0]),
        type: "missing-unit",
        severity: "medium",
        sourceId: section.id,
        message: `Numeric value "${match[1]}" appears without an adjacent unit in ${section.title}.`,
        evidence: context,
        recommendation: "Add the intended unit or rewrite the sentence so the quantity is unambiguous.",
      });
    }
  });
  return findings;
}

function detectRangeOutliers(measurements) {
  return measurements.flatMap((measurement) => {
    if (measurement.unitFamily === "temperature" && (measurement.value < -90 || measurement.value > 120)) {
      return [{
        id: stableId("temperature-outlier", measurement.id),
        type: "range-outlier",
        severity: "high",
        sourceId: measurement.sourceId,
        message: `${measurement.raw} is outside a plausible wet-lab manuscript temperature range.`,
        evidence: measurement.context,
        recommendation: "Confirm whether this is a typo, a specialized protocol condition, or a missing decimal point.",
      }];
    }
    if (measurement.unitFamily === "percent" && (measurement.value < 0 || measurement.value > 100)) {
      return [{
        id: stableId("percent-outlier", measurement.id),
        type: "range-outlier",
        severity: "medium",
        sourceId: measurement.sourceId,
        message: `${measurement.raw} is outside a standard 0-100 percent range.`,
        evidence: measurement.context,
        recommendation: "Clarify whether the value is a percentage, fold change, or relative difference.",
      }];
    }
    return [];
  });
}

function detectTrackedTermUnitDrift(measurements, trackedTerms) {
  const findings = [];
  trackedTerms.forEach((term) => {
    const related = measurements.filter((measurement) => {
      return measurement.subject === term.name &&
        (measurement.unitFamily === "molar_concentration" || measurement.unitFamily === "mass_concentration");
    });
    if (related.length < 2) {
      return;
    }
    const families = new Set(related.map((measurement) => measurement.unitFamily));
    const concentrationFamilies = new Set(
      related
        .map((measurement) => measurement.unitFamily)
        .filter((family) => family === "molar_concentration" || family === "mass_concentration")
    );
    if (concentrationFamilies.size > 1) {
      findings.push({
        id: stableId("unit-family-conflict", term.name, related.map((item) => item.raw).join("|")),
        type: "unit-family-conflict",
        severity: "high",
        sourceId: related.map((item) => item.sourceId).join(","),
        message: `${term.name} uses both molar and mass concentration units.`,
        evidence: related.map((item) => `${item.sourceId}: ${item.raw}`).join("; "),
        recommendation: "Add a molecular-weight conversion note or standardize the manuscript to one concentration basis.",
      });
      return;
    }
    if (families.size === 1) {
      const units = new Set(related.map((measurement) => measurement.unit));
      if (units.size > 1 && term.requireSingleUnit !== false) {
        findings.push({
          id: stableId("unit-scale-drift", term.name, [...units].join("|")),
          type: "unit-scale-drift",
          severity: "low",
          sourceId: related.map((item) => item.sourceId).join(","),
          message: `${term.name} is reported in multiple unit scales: ${[...units].join(", ")}.`,
          evidence: related.map((item) => `${item.sourceId}: ${item.raw}`).join("; "),
          recommendation: "Keep the source units if scientifically useful, but include a normalized value for reviewer comparison.",
        });
      }
    }
  });
  return findings;
}

function detectTableUnitDrift(tables, trackedTerms) {
  const findings = [];
  tables.forEach((table, tableIndex) => {
    const tableId = table.id || `table-${tableIndex + 1}`;
    const columns = table.columns || [];
    const rows = table.rows || [];
    columns.forEach((column, columnIndex) => {
      const headerText = column.name || String(column);
      const headerUnit = extractUnitFromHeader(headerText);
      if (!headerUnit) {
        return;
      }
      rows.forEach((row, rowIndex) => {
        const cellValue = String(row[columnIndex] ?? "");
        for (const match of cellValue.matchAll(MEASUREMENT_RE)) {
          const cellUnit = normalizeUnit(match[2]);
          if (!cellUnit) {
            continue;
          }
          if (cellUnit.family !== headerUnit.family || cellUnit.canonical !== headerUnit.canonical) {
            const subject = inferSubject(`${headerText} ${cellValue}`, trackedTerms) || headerText;
            findings.push({
              id: stableId("table-unit-drift", tableId, rowIndex, columnIndex, cellUnit.canonical, headerUnit.canonical),
              type: "table-unit-drift",
              severity: cellUnit.family === headerUnit.family ? "medium" : "high",
              sourceId: tableId,
              message: `${subject} cell unit ${cellUnit.canonical} does not match header unit ${headerUnit.canonical}.`,
              evidence: `${table.title || tableId}, row ${rowIndex + 1}, column "${headerText}": ${cellValue}`,
              recommendation: "Convert the cell value to the header unit or split the column by unit.",
            });
          }
        }
      });
    });
  });
  return findings;
}

function buildReviewerActions(findings) {
  const actions = findings.map((finding, index) => ({
    id: stableId("review-action", finding.id),
    priority: finding.severity === "high" ? 1 : finding.severity === "medium" ? 2 : 3,
    label: `Action ${index + 1}`,
    action: finding.recommendation,
    sourceId: finding.sourceId,
    blocksSubmission: finding.severity === "high",
  }));
  return actions.sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label));
}

function calculateReadinessScore(findings) {
  const penalty = findings.reduce((total, finding) => {
    if (finding.severity === "high") {
      return total + 22;
    }
    if (finding.severity === "medium") {
      return total + 11;
    }
    return total + 5;
  }, 0);
  return Math.max(0, 100 - penalty);
}

function normalizeTrackedTerm(term) {
  if (typeof term === "string") {
    return { name: term, aliases: [term], requireSingleUnit: true };
  }
  return {
    name: term.name,
    aliases: term.aliases && term.aliases.length ? term.aliases : [term.name],
    requireSingleUnit: term.requireSingleUnit !== false,
  };
}

function inferSubject(text, trackedTerms) {
  const lower = text.toLowerCase();
  for (const term of trackedTerms) {
    if (term.aliases.some((alias) => lower.includes(alias.toLowerCase()))) {
      return term.name;
    }
  }
  const words = compactWhitespace(text)
    .split(/\s+/)
    .map((word) => word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9-]+$/g, ""))
    .filter(Boolean);
  const candidates = words.filter((word) => !STOPWORDS.has(word.toLowerCase()) && /[A-Za-z]/.test(word));
  return candidates.slice(-3, -1).join(" ") || null;
}

function inferSectionSubject(text, measurementIndex, trackedTerms) {
  const sentence = sentenceAround(text, measurementIndex);
  const lowerSentence = sentence.text.toLowerCase();
  let best = null;
  trackedTerms.forEach((term) => {
    term.aliases.forEach((alias) => {
      const aliasIndex = lowerSentence.indexOf(alias.toLowerCase());
      if (aliasIndex === -1) {
        return;
      }
      const distance = Math.abs(aliasIndex - (measurementIndex - sentence.start));
      if (!best || distance < best.distance) {
        best = { name: term.name, distance };
      }
    });
  });
  return best ? best.name : inferSubject(sentence.text, trackedTerms);
}

function sentenceAround(text, index) {
  const before = text.slice(0, index);
  const after = text.slice(index);
  const previousBoundary = Math.max(before.lastIndexOf("."), before.lastIndexOf(";"), before.lastIndexOf("\n"));
  const nextBoundaryCandidates = [after.indexOf("."), after.indexOf(";"), after.indexOf("\n")]
    .filter((candidate) => candidate !== -1);
  const start = previousBoundary === -1 ? 0 : previousBoundary + 1;
  const end = nextBoundaryCandidates.length === 0
    ? text.length
    : index + Math.min(...nextBoundaryCandidates) + 1;
  return {
    start,
    text: text.slice(start, end),
  };
}

function normalizeUnit(rawUnit) {
  if (!rawUnit) {
    return null;
  }
  const normalized = rawUnit
    .replace(/\s+/g, "")
    .replace(/^micro/i, "micro")
    .replace(/^µ/i, "u")
    .replace(/^°C$/i, "degC")
    .replace(/^xg$/i, "xg");
  const definition = UNIT_BY_PATTERN.get(normalized.toLowerCase());
  if (definition) {
    return definition;
  }
  return UNIT_BY_PATTERN.get(rawUnit.toLowerCase()) || null;
}

function normalizeValue(value, unit) {
  if (unit.family === "temperature") {
    return value;
  }
  return Number((value * unit.scale).toPrecision(8));
}

function extractUnitFromHeader(headerText) {
  const match = String(headerText).match(/\(([^)]+)\)/);
  if (!match) {
    return null;
  }
  return normalizeUnit(match[1].trim());
}

function dedupeFindings(findings) {
  const seen = new Set();
  const deduped = [];
  for (const finding of findings) {
    const key = `${finding.type}|${finding.sourceId}|${finding.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(finding);
  }
  return deduped.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.id.localeCompare(b.id));
}

function severityRank(severity) {
  return { high: 1, medium: 2, low: 3 }[severity] || 4;
}

function countBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function looksLikeCitationOrStatistic(context) {
  return /\b(?:p\s*[<=>]|n\s*=|fig(?:ure)?\.?\s*\d|table\s*\d|ref(?:erence)?\s*\d)\b/i.test(context);
}

function digestFor(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function stableId(...parts) {
  return `muca_${digestFor(parts)}`;
}

function compactWhitespace(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  analyzeManuscript,
  extractSectionMeasurements,
  extractTableMeasurements,
  normalizeUnit,
};
