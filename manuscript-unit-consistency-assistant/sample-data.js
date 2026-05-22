"use strict";

const sampleManuscript = {
  manuscriptId: "SCIBASE-MUCA-001",
  title: "Metabolic rescue assay draft with unit hygiene risks",
  trackedTerms: [
    { name: "metformin", aliases: ["metformin"], requireSingleUnit: true },
    { name: "glucose", aliases: ["glucose"], requireSingleUnit: true },
    { name: "IL-6", aliases: ["IL-6", "IL6"], requireSingleUnit: true },
    { name: "TNF-alpha", aliases: ["TNF-alpha", "TNF"], requireSingleUnit: true },
  ],
  sections: [
    {
      id: "methods-cell-culture",
      title: "Methods: cell culture and dosing",
      text: [
        "Cells were seeded at 20,000 cells/well in 96-well plates.",
        "Metformin was added at 5 mM for 24 h, while a later paragraph lists metformin at 2 mg/mL without a conversion note.",
        "The glucose rescue arm used 5 mg/mL glucose for 6 h.",
        "Pellets were centrifuged at 12,000 for 10 min before lysis.",
      ].join(" "),
    },
    {
      id: "results-cytokines",
      title: "Results: cytokine response",
      text: [
        "IL-6 fell from 180 pg/mL to 0.22 ng/mL after treatment.",
        "ATP increased by 35 compared with vehicle control.",
        "A draft assay note says the plate was heated to 370 C for 15 min.",
      ].join(" "),
    },
  ],
  tables: [
    {
      id: "table-cytokines",
      title: "Table 1. Inflammation marker summary",
      columns: [
        { name: "Group" },
        { name: "IL-6 (pg/mL)" },
        { name: "TNF-alpha (pg/mL)" },
      ],
      rows: [
        ["Vehicle", "180 pg/mL", "0.09 ng/mL"],
        ["Metformin", "0.21 ng/mL", "70 pg/mL"],
      ],
    },
  ],
};

const cleanManuscript = {
  manuscriptId: "SCIBASE-MUCA-CLEAN",
  title: "Clean cytokine assay draft",
  trackedTerms: [
    { name: "metformin", aliases: ["metformin"], requireSingleUnit: true },
    { name: "IL-6", aliases: ["IL-6"], requireSingleUnit: true },
  ],
  sections: [
    {
      id: "methods",
      title: "Methods",
      text: "Cells were seeded at 20,000 cells/well. Metformin was added at 5 mM for 24 h and plates were held at 37 C.",
    },
    {
      id: "results",
      title: "Results",
      text: "IL-6 changed from 180 pg/mL to 120 pg/mL after treatment.",
    },
  ],
  tables: [
    {
      id: "table-clean",
      title: "Table 1. Cytokine results",
      columns: [{ name: "Group" }, { name: "IL-6 (pg/mL)" }],
      rows: [
        ["Vehicle", "180 pg/mL"],
        ["Metformin", "120 pg/mL"],
      ],
    },
  ],
};

module.exports = {
  sampleManuscript,
  cleanManuscript,
};
