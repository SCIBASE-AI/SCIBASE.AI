"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { analyzePacket, analyzePackets, validRrid } = require("../src");

test("validates RRID-style identifiers", () => {
  assert.equal(validRrid("RRID:AB_123456"), true);
  assert.equal(validRrid("RRID:CVCL_SYN1"), true);
  assert.equal(validRrid("AB_123456"), false);
});

test("releases clean authenticated materials", () => {
  const review = analyzePacket({
    id: "clean",
    title: "Clean authenticated antibody assay",
    reviewDate: "2026-08-15",
    materials: [
      {
        name: "Anti-TNF clone T1",
        type: "antibody",
        rrid: "RRID:AB_100001",
        lot: "LOT-TNF-2601",
        species: "human",
        target: "TNF",
        assayTargets: ["TNF"],
        validationEvidence: ["knockdown specificity", "orthogonal ELISA"],
        validationDate: "2026-06-01",
        contaminationStatus: "not_detected"
      }
    ],
    assays: [
      { name: "TNF ELISA", materialName: "Anti-TNF clone T1", organism: "human", target: "TNF" }
    ]
  });

  assert.equal(review.decision, "RELEASE");
  assert.equal(review.findingCount, 0);
});

test("routes missing RRID, stale validation, and organism mismatch to review", () => {
  const review = analyzePacket({
    id: "review",
    title: "Review material identity",
    reviewDate: "2026-08-15",
    materials: [
      {
        name: "Legacy anti-pERK",
        type: "antibody",
        rrid: "",
        lot: "LOT-OLD",
        species: "mouse",
        claimedOrganism: "human",
        target: "pERK",
        assayTargets: ["pERK"],
        validationEvidence: ["vendor blot"],
        validationDate: "2020-01-01",
        contaminationStatus: "not_detected"
      }
    ],
    assays: [
      { name: "Human pERK blot", materialName: "Legacy anti-pERK", organism: "human", target: "pERK" }
    ]
  });

  assert.equal(review.decision, "REVIEW");
  assert.ok(review.findings.some((item) => item.code === "MISSING_OR_INVALID_RRID"));
  assert.ok(review.findings.some((item) => item.code === "STALE_VALIDATION_DATE"));
  assert.ok(review.findings.some((item) => item.code === "ASSAY_ORGANISM_MISMATCH"));
});

test("holds contaminated cell-derived materials", () => {
  const review = analyzePacket({
    id: "contaminated",
    title: "Contaminated cell stock",
    reviewDate: "2026-08-15",
    materials: [
      {
        name: "Cell stock",
        type: "cell_line",
        rrid: "RRID:CVCL_SYN9",
        lot: "CELL-01",
        species: "human",
        validationEvidence: ["STR profile"],
        validationDate: "2026-07-01",
        contaminationStatus: "positive",
        passageRange: { min: 2, max: 9 },
        reportedPassage: 5
      }
    ],
    assays: []
  });

  assert.equal(review.decision, "HOLD");
  assert.ok(review.findings.some((item) => item.code === "CONTAMINATED_CELL_MATERIAL"));
});

test("holds antibody target mismatch and impossible passage ranges", () => {
  const review = analyzePacket({
    id: "hold",
    title: "Mismatched antibody target",
    reviewDate: "2026-08-15",
    materials: [
      {
        name: "Stem cell stock",
        type: "primary_cell",
        rrid: "RRID:CVCL_SYN8",
        lot: "STEM-01",
        species: "human",
        validationEvidence: ["identity PCR"],
        validationDate: "2026-07-01",
        contaminationStatus: "negative",
        passageRange: { min: 12, max: 4 },
        reportedPassage: 18
      },
      {
        name: "Anti-GFAP",
        type: "antibody",
        rrid: "RRID:AB_100002",
        lot: "AB-02",
        species: "human",
        target: "GFAP",
        assayTargets: ["GFAP"],
        validationEvidence: ["knockdown panel"],
        validationDate: "2026-07-01",
        contaminationStatus: "not_detected"
      }
    ],
    assays: [
      { name: "MAP2 stain", materialName: "Anti-GFAP", organism: "human", target: "MAP2" }
    ]
  });

  assert.equal(review.decision, "HOLD");
  assert.ok(review.findings.some((item) => item.code === "ANTIBODY_TARGET_MISMATCH"));
  assert.ok(review.findings.some((item) => item.code === "IMPOSSIBLE_PASSAGE_RANGE"));
});

test("summarizes packet decisions deterministically", () => {
  const report = analyzePackets([
    {
      id: "release",
      title: "Release",
      materials: [
        {
          name: "Anti-A",
          type: "antibody",
          rrid: "RRID:AB_1",
          lot: "L1",
          species: "human",
          target: "A",
          assayTargets: ["A"],
          validationEvidence: ["specificity"],
          validationDate: "2026-07-01",
          contaminationStatus: "not_detected"
        }
      ],
      assays: [{ name: "A", materialName: "Anti-A", organism: "human", target: "A" }]
    },
    {
      id: "hold",
      title: "Hold",
      materials: [
        {
          name: "Line",
          type: "cell_line",
          rrid: "RRID:CVCL_1",
          lot: "L2",
          species: "human",
          validationEvidence: ["STR"],
          validationDate: "2026-07-01",
          contaminationStatus: "detected"
        }
      ],
      assays: []
    }
  ]);

  assert.equal(report.packetCount, 2);
  assert.equal(report.decisionCounts.RELEASE, 1);
  assert.equal(report.decisionCounts.HOLD, 1);
});
