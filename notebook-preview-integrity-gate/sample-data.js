"use strict";

const cleanNotebookPackage = {
  projectId: "sci-preview-clean-001",
  title: "Cryo EM Morphology Notebook Preview",
  owner: "Cell Systems Lab",
  license: "CC-BY-4.0",
  metadata: {
    doi: "10.5555/scibase.preview.001",
    authors: [
      { name: "Nora Patel", affiliation: "Cell Systems Lab", orcid: "0000-0002-1825-0097" },
      { name: "Elijah Chen", affiliation: "Northbridge Institute" },
    ],
    keywords: ["cryo-em", "segmentation", "morphology"],
    license: "CC-BY-4.0",
    resourceType: "ComputationalNotebook",
    accessRights: "open",
    schemaOrgType: "Dataset",
    publisher: "SCIBASE.AI",
    publicationYear: 2026,
  },
  execution: {
    environment: {
      kernel: "python3",
      language: "python",
      runtime: "python 3.11.9",
      lockfileDigest: "sha256:f2a8c2d8e3d05d2efc0104989f53c4cc36ec",
      seedPolicy: "All stochastic steps use seed 4421 and are logged in run metadata.",
      dependencies: [
        { name: "numpy", version: "1.26.4" },
        { name: "pandas", version: "2.2.2" },
        { name: "scikit-image", version: "0.23.2" },
      ],
    },
  },
  notebook: {
    path: "notebooks/morphology-preview.ipynb",
    cells: [
      {
        cellType: "markdown",
        source: "# Cryo EM morphology QC\nThis notebook previews sample-level segmentation quality.",
      },
      {
        cellType: "code",
        executionCount: 1,
        source: "import pandas as pd\nsummary = pd.read_csv('../data/summary.csv')\nsummary.head()",
        outputs: [
          {
            data: {
              "text/plain": "sample_id area_um2 eccentricity\nA01 12.5 0.41\nA02 13.1 0.39",
            },
          },
        ],
      },
      {
        cellType: "code",
        executionCount: 2,
        source: "plot_segmentation_overlay(seed=4421)",
        altText: "Segmentation overlay with nuclei boundaries highlighted in green.",
        outputs: [
          {
            data: {
              "image/png": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NkYGD4DwABBAEAgi6xWQAAAABJRU5ErkJggg==",
            },
          },
        ],
      },
    ],
  },
  artifacts: [
    {
      path: "data/summary.csv",
      type: "dataset",
      sizeBytes: 18432,
      checksum: "sha256:2cb0c8f8b4c131e178e3e2f13c05b36f",
      mimeType: "text/csv",
      license: "CC-BY-4.0",
      previewGenerated: true,
    },
    {
      path: "results/segmentation-overlay.png",
      type: "figure",
      sizeBytes: 94421,
      checksum: "sha256:7f379b73698a4c81a39f6d1c",
      mimeType: "image/png",
      license: "CC-BY-4.0",
      previewGenerated: true,
    },
  ],
};

const riskyNotebookPackage = {
  projectId: "sci-preview-risk-007",
  title: "Unvetted Oncology Biomarker Notebook",
  owner: "Translational Oncology Group",
  metadata: {
    authors: [{ name: "A. Reviewer" }],
    keywords: [],
    accessRights: "restricted",
  },
  execution: {
    environment: {
      kernel: "python3",
      language: "python",
      runtime: "python 3.10",
      dependencies: [
        { name: "pandas", version: "latest" },
        { name: "lifelines" },
      ],
    },
  },
  notebook: {
    path: "notebooks/biomarker.ipynb",
    cells: [
      {
        cellType: "code",
        executionCount: 3,
        source: "API_KEY='demo_credential_should_be_redacted_1234567890'\nload_private_patient_table()",
        outputs: [
          {
            data: {
              "text/html": "<script>alert('inline')</script><table><tr><td>patient_id</td></tr></table>",
            },
          },
        ],
      },
      {
        cellType: "code",
        executionCount: 2,
        source: "render_kaplan_meier_plot()",
        outputs: [
          {
            data: {
              "image/png": "x".repeat(700 * 1024),
            },
          },
        ],
      },
      {
        cellType: "markdown",
        source: "Final figure is pending manual upload.",
      },
    ],
  },
  artifacts: [
    {
      path: "data/patient-export.csv",
      type: "dataset",
      sizeBytes: 19000000,
      mimeType: "text/csv",
      previewGenerated: false,
    },
  ],
};

module.exports = {
  cleanNotebookPackage,
  riskyNotebookPackage,
};
