"use strict";

const assert = require("assert");
const {
  auditCollaborativeTableFormulaGuard,
  evaluateFormula,
  extractFormulaReferences,
  expandRange,
} = require("./index");

function testFormulaHelpers() {
  assert.deepStrictEqual(expandRange("A1:B2"), ["A1", "B1", "A2", "B2"]);
  assert.deepStrictEqual(extractFormulaReferences("=SUM(A2:B3)+C4").sort(), ["A2", "A3", "B2", "B3", "C4"]);

  const cells = new Map([
    ["A1", { address: "A1", value: 2 }],
    ["B1", { address: "B1", value: 3 }],
    ["C1", { address: "C1", formula: "=A1*B1" }],
  ]);
  assert.strictEqual(evaluateFormula("=SUM(A1:B1)+C1", cells), 11);
}

function testCleanDocumentAllowsExport() {
  const report = auditCollaborativeTableFormulaGuard({
    documentId: "clean-manuscript",
    sections: [{
      id: "results",
      tables: [{
        id: "primary-endpoint",
        source: {
          type: "notebook",
          cellId: "analysis-12",
          reviewedOutputHash: "sha256:good",
          currentOutputHash: "sha256:good",
          reviewedAt: "2026-05-30T12:00:00Z",
          outputGeneratedAt: "2026-05-30T11:45:00Z",
        },
        rows: [
          [{ value: "Group" }, { value: "N" }, { value: "Events" }, { value: "Rate" }],
          [{ value: "Control" }, { value: 80 }, { value: 20 }, { formula: "=C2/B2", value: 0.25 }],
          [{ value: "Treatment" }, { value: 100 }, { value: 30 }, { formula: "=C3/B3", value: 0.3 }],
        ],
      }],
    }],
  });

  assert.strictEqual(report.decision, "allow-export");
  assert.strictEqual(report.issues.length, 0);
}

function testProblemDocumentHoldsExport() {
  const report = auditCollaborativeTableFormulaGuard({
    documentId: "problem-manuscript",
    sections: [{
      id: "locked-results",
      lockedAt: "2026-05-30T10:00:00Z",
      lockedBy: "lead-author",
      tables: [{
        id: "collaborative-derived-values",
        source: {
          type: "notebook",
          cellId: "nb-cell-9",
          reviewedOutputHash: "sha256:old",
          currentOutputHash: "sha256:new",
          reviewedAt: "2026-05-30T10:00:00Z",
          outputGeneratedAt: "2026-05-30T10:30:00Z",
        },
        edits: [{
          type: "formula-change",
          cell: "D2",
          actor: "coauthor-b",
          at: "2026-05-30T11:00:00Z",
          formula: "=C2/B2",
        }],
        rows: [
          [{ value: "Group" }, { value: "N" }, { value: "Events" }, { value: "Rate" }, { value: "Helper" }],
          [{ value: "Control" }, { value: 80 }, { value: 20 }, { formula: "=C2/B2", value: 0.29 }, { hidden: true, exported: true, value: "seed" }],
          [{ value: "Treatment" }, { value: 100 }, { value: 30 }, { formula: "=C4/B3", value: 0.3 }],
          [{ value: "Reviewer flag", exported: true, privateNotes: ["PRIVATE: check anomaly before sharing"], value: "reviewer-only note" }],
        ],
      }],
    }],
  });

  const codes = report.issues.map((finding) => finding.code);
  assert.strictEqual(report.decision, "hold-export");
  assert.ok(codes.includes("NOTEBOOK_OUTPUT_DRIFT"));
  assert.ok(codes.includes("UNREVIEWED_NOTEBOOK_OUTPUT"));
  assert.ok(codes.includes("LOCKED_SECTION_FORMULA_MUTATION"));
  assert.ok(codes.includes("STALE_TABLE_DERIVED_VALUE"));
  assert.ok(codes.includes("BROKEN_TABLE_FORMULA_REFERENCE"));
  assert.ok(codes.includes("HIDDEN_CELL_EXPORT_LEAK"));
  assert.ok(codes.includes("PRIVATE_NOTE_TABLE_EXPORT_LEAK"));
}

function testFormulaCycleIsIsolated() {
  const report = auditCollaborativeTableFormulaGuard({
    documentId: "cycle-manuscript",
    sections: [{
      id: "results",
      tables: [{
        id: "cycle-table",
        rows: [
          [{ formula: "=B1", value: 1 }, { formula: "=A1", value: 1 }, { formula: "=D1", value: 4 }, { value: 4 }],
        ],
      }],
    }],
  });

  const cycleFindings = report.issues.filter((finding) => finding.code === "TABLE_FORMULA_REFERENCE_CYCLE");
  const unrelatedFindings = report.issues.filter((finding) => finding.cell === "C1" && finding.code === "TABLE_FORMULA_REFERENCE_CYCLE");

  assert.ok(cycleFindings.length >= 1);
  assert.strictEqual(unrelatedFindings.length, 0);
}

function run() {
  testFormulaHelpers();
  testCleanDocumentAllowsExport();
  testProblemDocumentHoldsExport();
  testFormulaCycleIsIsolated();
  console.log("collaborative-table-formula-guard tests passed");
}

run();
