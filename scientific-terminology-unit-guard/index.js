const HIGH = "high";
const MEDIUM = "medium";
const LOW = "low";

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function list(value, field) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  return value;
}

function normalizeToken(value) {
  return String(value || "").trim();
}

function normalizeDocument(raw) {
  return {
    documentId: requireString(raw.documentId, "documentId"),
    title: requireString(raw.title, "title"),
    glossary: raw.glossary || {},
    units: raw.units || {},
    variables: raw.variables || {},
    blocks: list(raw.blocks || [], "blocks").map((block) => ({
      id: requireString(block.id, "block.id"),
      author: requireString(block.author, "block.author"),
      text: String(block.text || ""),
      acronyms: list(block.acronyms || [], "block.acronyms"),
      units: list(block.units || [], "block.units"),
      variables: list(block.variables || [], "block.variables"),
    })),
    suggestions: list(raw.suggestions || [], "suggestions").map((suggestion) => ({
      id: requireString(suggestion.id, "suggestion.id"),
      author: requireString(suggestion.author, "suggestion.author"),
      targetBlock: requireString(suggestion.targetBlock, "suggestion.targetBlock"),
      text: String(suggestion.text || ""),
      acronyms: list(suggestion.acronyms || [], "suggestion.acronyms"),
      units: list(suggestion.units || [], "suggestion.units"),
      variables: list(suggestion.variables || [], "suggestion.variables"),
    })),
  };
}

function finding(code, severity, source, message, remediation) {
  return {
    code,
    severity,
    sourceId: source.id,
    author: source.author,
    message,
    remediation,
  };
}

function analyzeSource(doc, source, findings) {
  for (const item of source.acronyms) {
    const short = normalizeToken(item.short);
    const expected = normalizeToken(doc.glossary[short]);
    const observed = normalizeToken(item.long);
    if (!short) {
      continue;
    }
    if (!expected) {
      findings.push(
        finding(
          "UNKNOWN_ACRONYM",
          MEDIUM,
          source,
          `${short} is used but is absent from the shared glossary.`,
          "Add the acronym to the shared glossary or replace it before publication export."
        )
      );
    } else if (!observed) {
      findings.push(
        finding(
          "MISSING_FIRST_USE_EXPANSION",
          MEDIUM,
          source,
          `${short} appears without its first-use expansion.`,
          `Expand ${short} as "${expected}" at first use in the collaborative document.`
        )
      );
    } else if (observed.toLowerCase() !== expected.toLowerCase()) {
      findings.push(
        finding(
          "ACRONYM_DRIFT",
          HIGH,
          source,
          `${short} is defined as "${observed}" but glossary expects "${expected}".`,
          "Resolve the conflicting expansion in the suggestion or block before accepting changes."
        )
      );
    }
  }

  for (const item of source.units) {
    const quantity = normalizeToken(item.quantity);
    const unit = normalizeToken(item.unit);
    const expected = normalizeToken(doc.units[quantity]);
    if (!expected) {
      findings.push(
        finding(
          "UNKNOWN_QUANTITY_UNIT",
          LOW,
          source,
          `${quantity} has unit "${unit}" but no canonical unit is registered.`,
          "Register a canonical unit or mark the quantity as intentionally free-form."
        )
      );
    } else if (unit !== expected) {
      findings.push(
        finding(
          "UNIT_CONFLICT",
          HIGH,
          source,
          `${quantity} uses "${unit}" but canonical unit is "${expected}".`,
          "Convert or annotate the value before export so collaborators compare like with like."
        )
      );
    }
  }

  for (const item of source.variables) {
    const symbol = normalizeToken(item.symbol);
    const meaning = normalizeToken(item.meaning);
    const expected = normalizeToken(doc.variables[symbol]);
    if (!expected) {
      findings.push(
        finding(
          "UNREGISTERED_VARIABLE",
          LOW,
          source,
          `${symbol} is used in an equation context without a shared definition.`,
          "Add the variable to the equation legend before accepting the edit."
        )
      );
    } else if (meaning.toLowerCase() !== expected.toLowerCase()) {
      findings.push(
        finding(
          "VARIABLE_MEANING_DRIFT",
          HIGH,
          source,
          `${symbol} means "${meaning}" here but shared definition is "${expected}".`,
          "Resolve the variable definition mismatch before rendering equations or exports."
        )
      );
    }
  }
}

function assessTerminologyAndUnits(rawDocument) {
  const doc = normalizeDocument(rawDocument);
  const findings = [];

  for (const block of doc.blocks) {
    analyzeSource(doc, block, findings);
  }
  for (const suggestion of doc.suggestions) {
    analyzeSource(doc, suggestion, findings);
  }

  const sourceIds = new Set([...doc.blocks, ...doc.suggestions].map((item) => item.id));
  for (const suggestion of doc.suggestions) {
    if (!sourceIds.has(suggestion.targetBlock)) {
      findings.push(
        finding(
          "ORPHAN_SUGGESTION_TARGET",
          MEDIUM,
          suggestion,
          `Suggestion targets missing block ${suggestion.targetBlock}.`,
          "Retarget or close the suggestion before merging collaborative edits."
        )
      );
    }
  }

  const high = findings.filter((item) => item.severity === HIGH).length;
  const medium = findings.filter((item) => item.severity === MEDIUM).length;
  const decision = high > 0 ? "hold" : medium > 0 ? "revise" : "release";

  return {
    documentId: doc.documentId,
    title: doc.title,
    decision,
    summary: {
      blocksReviewed: doc.blocks.length,
      suggestionsReviewed: doc.suggestions.length,
      findings: findings.length,
      high,
      medium,
      low: findings.filter((item) => item.severity === LOW).length,
    },
    findings,
    releaseCriteria: [
      "Shared glossary acronyms keep one expansion across all blocks and suggestions.",
      "Scientific quantities use the canonical unit selected for the collaborative document.",
      "Equation variables keep one meaning before WYSIWYG, Markdown, LaTeX, or export render.",
      "Suggestions cannot introduce terminology drift while being accepted into the manuscript.",
    ],
  };
}

module.exports = {
  assessTerminologyAndUnits,
  normalizeDocument,
};
