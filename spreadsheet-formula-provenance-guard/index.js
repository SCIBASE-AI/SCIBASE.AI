const HIGH = "high";
const MEDIUM = "medium";
const LOW = "low";

const VOLATILE_FUNCTIONS = ["NOW", "TODAY", "RAND", "RANDBETWEEN", "OFFSET", "INDIRECT"];

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function array(value, field) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  return value;
}

function unique(values) {
  return [...new Set(values.map(String))];
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function normalizeCell(raw, sheetName, index) {
  return {
    address: requiredString(raw.address, `${sheetName}.cells[${index}].address`),
    formula: raw.formula ? String(raw.formula) : "",
    cachedValue: raw.cachedValue === undefined ? null : raw.cachedValue,
    recalculatedAt: raw.recalculatedAt ? String(raw.recalculatedAt) : "",
    sourceRefs: unique(raw.sourceRefs || []),
  };
}

function normalizeSheet(raw, index) {
  const name = requiredString(raw.name, `sheets[${index}].name`);
  return {
    name,
    hidden: Boolean(raw.hidden),
    purpose: raw.purpose ? String(raw.purpose) : "",
    cells: array(raw.cells || [], `${name}.cells`).map((cell, cellIndex) => normalizeCell(cell, name, cellIndex)),
  };
}

function normalizeSpreadsheet(raw) {
  return {
    datasetId: requiredString(raw.datasetId, "datasetId"),
    filename: requiredString(raw.filename, "filename"),
    uploadedAt: requiredString(raw.uploadedAt, "uploadedAt"),
    sha256: requiredString(raw.sha256, "sha256").toLowerCase(),
    macroEnabled: Boolean(raw.macroEnabled),
    externalLinks: unique(raw.externalLinks || []),
    exports: array(raw.exports || [], "exports").map((item, index) => ({
      format: requiredString(item.format, `exports[${index}].format`),
      path: requiredString(item.path, `exports[${index}].path`),
      sha256: requiredString(item.sha256, `exports[${index}].sha256`).toLowerCase(),
    })),
    sheets: array(raw.sheets || [], "sheets").map(normalizeSheet),
  };
}

function finding(code, severity, sourceId, message, remediation) {
  return { code, severity, sourceId, message, remediation };
}

function formulaFunctions(formula) {
  const matches = String(formula).toUpperCase().match(/[A-Z][A-Z0-9_.]*\s*\(/g) || [];
  return unique(matches.map((item) => item.replace(/\s*\($/, "")));
}

function hasExternalReference(formula) {
  return /\[[^\]]+\]|\bhttps?:\/\//i.test(String(formula));
}

function assessSpreadsheetProvenance(rawSpreadsheet) {
  const spreadsheet = normalizeSpreadsheet(rawSpreadsheet);
  const findings = [];
  const formulaCells = spreadsheet.sheets.flatMap((sheet) =>
    sheet.cells
      .filter((cell) => cell.formula)
      .map((cell) => ({ ...cell, sheet: sheet.name, sourceId: `${sheet.name}!${cell.address}` }))
  );

  if (!isSha256(spreadsheet.sha256)) {
    findings.push(
      finding(
        "INVALID_SPREADSHEET_DIGEST",
        HIGH,
        spreadsheet.filename,
        `${spreadsheet.filename} does not have a valid SHA-256 upload digest.`,
        "Record the original spreadsheet hash before accepting it as a citable dataset artifact."
      )
    );
  }

  if (spreadsheet.macroEnabled) {
    findings.push(
      finding(
        "MACRO_ENABLED_DATASET",
        HIGH,
        spreadsheet.filename,
        `${spreadsheet.filename} is macro-enabled and cannot be treated as inert tabular data.`,
        "Quarantine macro-enabled files or publish a macro-free normalized export with reviewed transformation notes."
      )
    );
  }

  if (spreadsheet.externalLinks.length > 0) {
    findings.push(
      finding(
        "EXTERNAL_WORKBOOK_LINKS",
        HIGH,
        spreadsheet.filename,
        `${spreadsheet.filename} depends on external workbook links: ${spreadsheet.externalLinks.join(", ")}.`,
        "Bundle source workbooks or replace formulas with reproducible local references before publication."
      )
    );
  }

  for (const sheet of spreadsheet.sheets) {
    if (sheet.hidden && sheet.cells.length > 0) {
      findings.push(
        finding(
          "HIDDEN_SHEET_WITH_DATA",
          MEDIUM,
          sheet.name,
          `${sheet.name} is hidden but contains data or formulas.`,
          "Expose the sheet, document its purpose, or exclude it from the release with an audit note."
        )
      );
    }
  }

  for (const cell of formulaCells) {
    const functions = formulaFunctions(cell.formula);
    const volatile = functions.filter((name) => VOLATILE_FUNCTIONS.includes(name));
    if (volatile.length > 0) {
      findings.push(
        finding(
          "VOLATILE_FORMULA",
          HIGH,
          cell.sourceId,
          `${cell.sourceId} uses volatile functions: ${volatile.join(", ")}.`,
          "Replace volatile formulas with fixed values or a scripted, versioned transformation."
        )
      );
    }

    if (hasExternalReference(cell.formula)) {
      findings.push(
        finding(
          "FORMULA_EXTERNAL_REFERENCE",
          HIGH,
          cell.sourceId,
          `${cell.sourceId} references an external workbook or URL.`,
          "Bundle the dependency and record its checksum, or normalize the formula into a local reproducible dataset."
        )
      );
    }

    if (cell.cachedValue === null || cell.recalculatedAt === "") {
      findings.push(
        finding(
          "STALE_OR_MISSING_CALCULATION_EVIDENCE",
          MEDIUM,
          cell.sourceId,
          `${cell.sourceId} lacks cached value or recalculation timestamp evidence.`,
          "Recalculate the workbook in a controlled environment and record cached values before preview/export."
        )
      );
    }

    if (cell.sourceRefs.length === 0) {
      findings.push(
        finding(
          "FORMULA_WITHOUT_PROVENANCE",
          MEDIUM,
          cell.sourceId,
          `${cell.sourceId} has no provenance references for its inputs.`,
          "Attach source ranges, instruments, upstream datasets, or transformation tickets for formula-derived values."
        )
      );
    }
  }

  const exportFormats = new Set(spreadsheet.exports.map((item) => item.format));
  if (!exportFormats.has("csv") && !exportFormats.has("parquet")) {
    findings.push(
      finding(
        "MISSING_NORMALIZED_EXPORT",
        HIGH,
        "exports",
        "Spreadsheet dataset has no CSV or parquet normalized export.",
        "Publish a normalized tabular export so reviewers can diff and re-use the dataset outside spreadsheet software."
      )
    );
  }

  for (const exported of spreadsheet.exports) {
    if (!isSha256(exported.sha256)) {
      findings.push(
        finding(
          "INVALID_EXPORT_DIGEST",
          HIGH,
          exported.path,
          `${exported.path} does not have a valid SHA-256 digest.`,
          "Record a digest for every normalized export before publication."
        )
      );
    }
  }

  const high = findings.filter((item) => item.severity === HIGH).length;
  const medium = findings.filter((item) => item.severity === MEDIUM).length;
  return {
    datasetId: spreadsheet.datasetId,
    filename: spreadsheet.filename,
    decision: high > 0 ? "hold" : medium > 0 ? "revise" : "release",
    summary: {
      sheetsReviewed: spreadsheet.sheets.length,
      formulaCellsReviewed: formulaCells.length,
      exportsReviewed: spreadsheet.exports.length,
      findings: findings.length,
      high,
      medium,
      low: findings.filter((item) => item.severity === LOW).length,
    },
    findings,
    releaseCriteria: [
      "Original spreadsheet and normalized exports have stable SHA-256 digests.",
      "Formula-derived cells avoid volatile functions and external workbook references.",
      "Formula cells carry cached value, recalculation timestamp, and provenance evidence.",
      "Hidden sheets, macros, and external links are disclosed or blocked before publication.",
      "At least one normalized CSV or parquet export is available for reproducible reuse.",
    ],
  };
}

module.exports = {
  assessSpreadsheetProvenance,
  normalizeSpreadsheet,
};
