"use strict";

const DEFAULT_TOLERANCE = 1e-9;
const PRIVATE_NOTE_PATTERNS = [
  /\bPRIVATE\b/i,
  /\breviewer[- ]only\b/i,
  /\bdo not export\b/i,
  /\binternal note\b/i,
  /\bconfidential\b/i,
];

function auditCollaborativeTableFormulaGuard(document, options = {}) {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const issues = [];
  const normalizedSections = (document.sections || []).map(normalizeSection);

  for (const section of normalizedSections) {
    for (const table of section.tables) {
      const cells = buildCellIndex(table);
      const formulaCells = [...cells.values()].filter((cell) => typeof cell.formula === "string" && cell.formula.trim());

      issues.push(...auditNotebookSource(section, table));
      issues.push(...auditLockedEdits(section, table));
      issues.push(...auditPrivateExportLeak(section, table, cells));
      issues.push(...auditHiddenExportLeak(section, table, cells));
      issues.push(...auditBrokenReferences(section, table, cells, formulaCells));
      issues.push(...auditFormulaCycles(section, table, cells, formulaCells));
      issues.push(...auditFormulaValues(section, table, cells, formulaCells, tolerance));
    }
  }

  const sortedIssues = issues.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code));
  const decision = decide(sortedIssues);

  return {
    documentId: document.documentId || "unknown-document",
    auditedAt: document.auditedAt || new Date().toISOString(),
    decision,
    summary: summarize(sortedIssues),
    issues: sortedIssues,
    remediation: buildRemediation(sortedIssues),
  };
}

function normalizeSection(section) {
  return {
    id: section.id || "untitled-section",
    title: section.title || section.id || "Untitled section",
    lockedAt: section.lockedAt || null,
    lockedBy: section.lockedBy || null,
    tables: section.tables || [],
  };
}

function buildCellIndex(table) {
  const cells = new Map();
  const rows = table.rows || [];

  rows.forEach((row, rowIndex) => {
    row.forEach((inputCell, columnIndex) => {
      const address = normalizeAddress(inputCell.address || `${columnName(columnIndex)}${rowIndex + 1}`);
      cells.set(address, {
        ...inputCell,
        address,
        rowIndex,
        columnIndex,
        tableId: table.id || "untitled-table",
      });
    });
  });

  return cells;
}

function auditNotebookSource(section, table) {
  const source = table.source || {};
  if (source.type !== "notebook") {
    return [];
  }

  const issues = [];
  if (source.reviewedOutputHash && source.currentOutputHash && source.reviewedOutputHash !== source.currentOutputHash) {
    issues.push(issue({
      code: "NOTEBOOK_OUTPUT_DRIFT",
      severity: "high",
      section,
      table,
      message: `Table ${tableName(table)} is sourced from notebook cell ${source.cellId || "unknown"} whose output hash changed after review.`,
      evidence: {
        reviewedOutputHash: source.reviewedOutputHash,
        currentOutputHash: source.currentOutputHash,
      },
    }));
  }

  if (source.reviewedAt && source.outputGeneratedAt && Date.parse(source.outputGeneratedAt) > Date.parse(source.reviewedAt)) {
    issues.push(issue({
      code: "UNREVIEWED_NOTEBOOK_OUTPUT",
      severity: "high",
      section,
      table,
      message: `Table ${tableName(table)} uses notebook output generated after the latest table review.`,
      evidence: {
        reviewedAt: source.reviewedAt,
        outputGeneratedAt: source.outputGeneratedAt,
      },
    }));
  }

  return issues;
}

function auditLockedEdits(section, table) {
  if (!section.lockedAt) {
    return [];
  }

  const lockedAt = Date.parse(section.lockedAt);
  return (table.edits || [])
    .filter((edit) => isFormulaAffectingEdit(edit) && Date.parse(edit.at) > lockedAt)
    .map((edit) => issue({
      code: "LOCKED_SECTION_FORMULA_MUTATION",
      severity: "high",
      section,
      table,
      cell: normalizeAddress(edit.cell || ""),
      message: `Formula-affecting edit ${edit.type || "unknown"} occurred after section lock.`,
      evidence: {
        edit,
        lockedAt: section.lockedAt,
        lockedBy: section.lockedBy || null,
      },
    }));
}

function auditPrivateExportLeak(section, table, cells) {
  const issues = [];

  for (const cell of cells.values()) {
    const exported = cell.exported !== false;
    const textFields = [cell.value, cell.exportedValue, cell.note, ...(cell.privateNotes || [])]
      .filter((value) => value !== undefined && value !== null)
      .map(String);

    const hasPrivateNote = (cell.privateNotes || []).length > 0;
    const matchedText = textFields.find((text) => PRIVATE_NOTE_PATTERNS.some((pattern) => pattern.test(text)));

    if (exported && (hasPrivateNote || matchedText)) {
      issues.push(issue({
        code: "PRIVATE_NOTE_TABLE_EXPORT_LEAK",
        severity: "high",
        section,
        table,
        cell,
        message: `Exported table cell ${cell.address} contains private or reviewer-only context.`,
        evidence: {
          privateNoteCount: (cell.privateNotes || []).length,
          matchedText: matchedText ? redactEvidence(matchedText) : null,
        },
      }));
    }
  }

  return issues;
}

function auditHiddenExportLeak(section, table, cells) {
  const issues = [];

  for (const cell of cells.values()) {
    if (cell.hidden === true && cell.exported !== false) {
      issues.push(issue({
        code: "HIDDEN_CELL_EXPORT_LEAK",
        severity: "medium",
        section,
        table,
        cell,
        message: `Hidden table cell ${cell.address} is still marked for export.`,
        evidence: {
          value: redactEvidence(cell.exportedValue ?? cell.value ?? ""),
        },
      }));
    }
  }

  return issues;
}

function auditBrokenReferences(section, table, cells, formulaCells) {
  const issues = [];

  for (const cell of formulaCells) {
    const refs = extractFormulaReferences(cell.formula);
    const missingRefs = refs.filter((ref) => !cells.has(ref));
    if (missingRefs.length > 0) {
      issues.push(issue({
        code: "BROKEN_TABLE_FORMULA_REFERENCE",
        severity: "high",
        section,
        table,
        cell,
        message: `Formula in ${cell.address} references missing cells: ${missingRefs.join(", ")}.`,
        evidence: {
          formula: cell.formula,
          missingRefs,
        },
      }));
    }
  }

  return issues;
}

function auditFormulaCycles(section, table, cells, formulaCells) {
  const issues = [];
  const formulaCellSet = new Set(formulaCells.map((cell) => cell.address));

  for (const cell of formulaCells) {
    const cycle = findCycle(cell.address, cells, formulaCellSet, new Set(), new Set(), []);
    if (cycle.length > 0) {
      issues.push(issue({
        code: "TABLE_FORMULA_REFERENCE_CYCLE",
        severity: "high",
        section,
        table,
        cell,
        message: `Formula dependency cycle detected: ${cycle.join(" -> ")}.`,
        evidence: { cycle },
      }));
    }
  }

  return dedupeIssues(issues);
}

function findCycle(address, cells, formulaCellSet, visiting, visited, path) {
  if (visiting.has(address)) {
    const start = path.indexOf(address);
    return path.slice(start).concat(address);
  }

  if (visited.has(address)) {
    return [];
  }

  visiting.add(address);
  path.push(address);

  const cell = cells.get(address);
  const refs = cell && cell.formula ? extractFormulaReferences(cell.formula).filter((ref) => formulaCellSet.has(ref)) : [];

  for (const ref of refs) {
    const cycle = findCycle(ref, cells, formulaCellSet, visiting, visited, path);
    if (cycle.length > 0) {
      return cycle;
    }
  }

  path.pop();
  visiting.delete(address);
  visited.add(address);
  return [];
}

function auditFormulaValues(section, table, cells, formulaCells, tolerance) {
  const issues = [];

  for (const cell of formulaCells) {
    const refs = extractFormulaReferences(cell.formula);
    if (refs.some((ref) => !cells.has(ref))) {
      continue;
    }

    const cyclicRefs = refs.filter((ref) => ref === cell.address);
    if (cyclicRefs.length > 0) {
      continue;
    }

    let expected;
    try {
      expected = evaluateFormula(cell.formula, cells, new Set([cell.address]));
    } catch (error) {
      issues.push(issue({
        code: "UNSUPPORTED_TABLE_FORMULA",
        severity: "medium",
        section,
        table,
        cell,
        message: `Formula in ${cell.address} could not be evaluated safely: ${error.message}`,
        evidence: { formula: cell.formula },
      }));
      continue;
    }

    const actual = numberFromCell(cell);
    if (typeof actual !== "number" || Number.isNaN(actual)) {
      issues.push(issue({
        code: "NON_NUMERIC_DERIVED_CELL",
        severity: "medium",
        section,
        table,
        cell,
        message: `Formula cell ${cell.address} has a non-numeric exported value.`,
        evidence: {
          formula: cell.formula,
          actual: cell.exportedValue ?? cell.value,
          expected,
        },
      }));
      continue;
    }

    if (Math.abs(actual - expected) > tolerance) {
      issues.push(issue({
        code: "STALE_TABLE_DERIVED_VALUE",
        severity: "high",
        section,
        table,
        cell,
        message: `Formula cell ${cell.address} is stale: expected ${formatNumber(expected)}, exported ${formatNumber(actual)}.`,
        evidence: {
          formula: cell.formula,
          actual,
          expected,
          delta: actual - expected,
        },
      }));
    }
  }

  return issues;
}

function evaluateFormula(formula, cells, stack = new Set()) {
  const expression = formula.trim().replace(/^=/, "");
  if (expression.length === 0) {
    throw new Error("empty formula");
  }

  const withFunctions = expression.replace(/\b(SUM|AVERAGE|MIN|MAX|COUNT)\(([^()]+)\)/gi, (_match, name, args) => {
    const values = expandFormulaArguments(args, cells, stack);
    switch (name.toUpperCase()) {
      case "SUM":
        return String(values.reduce((total, value) => total + value, 0));
      case "AVERAGE":
        return String(values.reduce((total, value) => total + value, 0) / values.length);
      case "MIN":
        return String(Math.min(...values));
      case "MAX":
        return String(Math.max(...values));
      case "COUNT":
        return String(values.length);
      default:
        throw new Error(`unsupported function ${name}`);
    }
  });

  const withCells = withFunctions.replace(/\b[A-Z]+[0-9]+\b/gi, (address) => {
    const value = valueForAddress(normalizeAddress(address), cells, stack);
    return String(value);
  });

  return evaluateArithmetic(withCells);
}

function expandFormulaArguments(args, cells, stack) {
  const values = [];
  const parts = args.split(",").map((part) => part.trim()).filter(Boolean);

  for (const part of parts) {
    if (/^[A-Z]+[0-9]+:[A-Z]+[0-9]+$/i.test(part)) {
      for (const address of expandRange(part)) {
        values.push(valueForAddress(address, cells, stack));
      }
    } else if (/^[A-Z]+[0-9]+$/i.test(part)) {
      values.push(valueForAddress(normalizeAddress(part), cells, stack));
    } else {
      values.push(evaluateArithmetic(part));
    }
  }

  if (values.length === 0) {
    throw new Error("formula function has no arguments");
  }

  return values;
}

function valueForAddress(address, cells, stack) {
  const cell = cells.get(address);
  if (!cell) {
    throw new Error(`missing cell ${address}`);
  }

  if (cell.formula) {
    if (stack.has(address)) {
      throw new Error(`formula cycle at ${address}`);
    }

    stack.add(address);
    const value = evaluateFormula(cell.formula, cells, stack);
    stack.delete(address);
    return value;
  }

  const value = numberFromCell(cell);
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`cell ${address} is not numeric`);
  }

  return value;
}

function evaluateArithmetic(input) {
  if (/[^0-9+\-*/().\s]/.test(input)) {
    throw new Error(`unsupported arithmetic expression: ${input}`);
  }

  const parser = new ArithmeticParser(input);
  const value = parser.parseExpression();
  parser.skipWhitespace();
  if (!parser.isDone()) {
    throw new Error(`unexpected token at ${parser.index}`);
  }
  if (!Number.isFinite(value)) {
    throw new Error("formula result is not finite");
  }

  return value;
}

class ArithmeticParser {
  constructor(input) {
    this.input = input;
    this.index = 0;
  }

  parseExpression() {
    let value = this.parseTerm();
    while (true) {
      this.skipWhitespace();
      if (this.peek() === "+") {
        this.index += 1;
        value += this.parseTerm();
      } else if (this.peek() === "-") {
        this.index += 1;
        value -= this.parseTerm();
      } else {
        return value;
      }
    }
  }

  parseTerm() {
    let value = this.parseFactor();
    while (true) {
      this.skipWhitespace();
      if (this.peek() === "*") {
        this.index += 1;
        value *= this.parseFactor();
      } else if (this.peek() === "/") {
        this.index += 1;
        value /= this.parseFactor();
      } else {
        return value;
      }
    }
  }

  parseFactor() {
    this.skipWhitespace();
    if (this.peek() === "+") {
      this.index += 1;
      return this.parseFactor();
    }
    if (this.peek() === "-") {
      this.index += 1;
      return -this.parseFactor();
    }
    if (this.peek() === "(") {
      this.index += 1;
      const value = this.parseExpression();
      this.skipWhitespace();
      if (this.peek() !== ")") {
        throw new Error("missing closing parenthesis");
      }
      this.index += 1;
      return value;
    }

    return this.parseNumber();
  }

  parseNumber() {
    this.skipWhitespace();
    const match = this.input.slice(this.index).match(/^\d+(?:\.\d+)?/);
    if (!match) {
      throw new Error(`expected number at ${this.index}`);
    }
    this.index += match[0].length;
    return Number(match[0]);
  }

  skipWhitespace() {
    while (/\s/.test(this.peek())) {
      this.index += 1;
    }
  }

  peek() {
    return this.input[this.index] || "";
  }

  isDone() {
    return this.index >= this.input.length;
  }
}

function extractFormulaReferences(formula) {
  const references = new Set();
  const expression = formula.replace(/^=/, "");
  const rangeMatches = expression.match(/\b[A-Z]+[0-9]+:[A-Z]+[0-9]+\b/gi) || [];
  for (const range of rangeMatches) {
    for (const address of expandRange(range)) {
      references.add(address);
    }
  }

  const scalarMatches = expression.match(/\b[A-Z]+[0-9]+\b/gi) || [];
  for (const address of scalarMatches) {
    references.add(normalizeAddress(address));
  }

  return [...references];
}

function expandRange(range) {
  const [start, end] = range.split(":").map(normalizeAddress);
  const startParts = splitAddress(start);
  const endParts = splitAddress(end);
  const addresses = [];

  const firstRow = Math.min(startParts.row, endParts.row);
  const lastRow = Math.max(startParts.row, endParts.row);
  const firstColumn = Math.min(startParts.column, endParts.column);
  const lastColumn = Math.max(startParts.column, endParts.column);

  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      addresses.push(`${columnName(column)}${row}`);
    }
  }

  return addresses;
}

function splitAddress(address) {
  const match = normalizeAddress(address).match(/^([A-Z]+)([0-9]+)$/);
  if (!match) {
    throw new Error(`invalid cell address ${address}`);
  }

  return {
    column: columnIndex(match[1]),
    row: Number(match[2]),
  };
}

function columnIndex(column) {
  return column.split("").reduce((index, character) => index * 26 + (character.charCodeAt(0) - 64), 0) - 1;
}

function columnName(index) {
  let column = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - 1) / 26);
  }
  return column;
}

function normalizeAddress(address) {
  return String(address || "").trim().toUpperCase();
}

function numberFromCell(cell) {
  const value = cell.exportedValue ?? cell.value ?? cell.lastComputedValue;
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isNaN(parsed) ? NaN : parsed;
  }

  return NaN;
}

function isFormulaAffectingEdit(edit) {
  const type = String(edit.type || "").toLowerCase();
  return ["formula-change", "value-change", "paste", "notebook-sync", "row-insert", "column-insert"].includes(type);
}

function issue({ code, severity, section, table, cell, message, evidence = {} }) {
  return {
    code,
    severity,
    sectionId: section.id,
    tableId: table.id || "untitled-table",
    cell: cell ? cell.address || cell : null,
    message,
    evidence,
  };
}

function tableName(table) {
  return table.title || table.id || "untitled table";
}

function redactEvidence(value) {
  const text = String(value);
  if (text.length <= 80) {
    return text;
  }
  return `${text.slice(0, 77)}...`;
}

function severityRank(severity) {
  return { high: 3, medium: 2, low: 1 }[severity] || 0;
}

function decide(issues) {
  if (issues.some((finding) => finding.severity === "high")) {
    return "hold-export";
  }
  if (issues.some((finding) => finding.severity === "medium")) {
    return "needs-review";
  }
  return "allow-export";
}

function summarize(issues) {
  const summary = { high: 0, medium: 0, low: 0, total: issues.length };
  for (const finding of issues) {
    summary[finding.severity] = (summary[finding.severity] || 0) + 1;
  }
  return summary;
}

function buildRemediation(issues) {
  const actions = new Set();

  for (const finding of issues) {
    if (finding.code === "STALE_TABLE_DERIVED_VALUE") {
      actions.add("Recompute stale derived table cells from the latest referenced inputs before export.");
    }
    if (finding.code === "BROKEN_TABLE_FORMULA_REFERENCE") {
      actions.add("Repair formula references or bind them to explicit table rows before accepting the collaborative change.");
    }
    if (finding.code === "LOCKED_SECTION_FORMULA_MUTATION") {
      actions.add("Route formula-affecting edits in locked sections through reviewer approval or unlock the section intentionally.");
    }
    if (finding.code === "PRIVATE_NOTE_TABLE_EXPORT_LEAK" || finding.code === "HIDDEN_CELL_EXPORT_LEAK") {
      actions.add("Strip private notes and hidden helper cells from the manuscript table export.");
    }
    if (finding.code === "NOTEBOOK_OUTPUT_DRIFT" || finding.code === "UNREVIEWED_NOTEBOOK_OUTPUT") {
      actions.add("Refresh notebook-derived table outputs and require a new review hash before release.");
    }
    if (finding.code === "TABLE_FORMULA_REFERENCE_CYCLE") {
      actions.add("Break circular table formulas and save a deterministic recalculation order.");
    }
  }

  return [...actions];
}

function dedupeIssues(issues) {
  const seen = new Set();
  return issues.filter((finding) => {
    const key = `${finding.code}:${finding.tableId}:${finding.cell}:${JSON.stringify(finding.evidence)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

module.exports = {
  auditCollaborativeTableFormulaGuard,
  buildCellIndex,
  evaluateFormula,
  extractFormulaReferences,
  expandRange,
};
