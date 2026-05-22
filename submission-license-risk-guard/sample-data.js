"use strict";

const challengePolicy = {
  id: "sbio-forecast-2026",
  title: "Regional biomarker forecasting challenge",
  sponsorReviewMode: "commercial-evaluation",
  allowedCodeLicenses: ["MIT", "Apache-2.0", "BSD-3-Clause"],
  allowedDataLicenses: ["CC-BY-4.0", "CC0-1.0", "ODC-BY-1.0"],
  allowedModelLicenses: ["Apache-2.0", "MIT", "OpenRAIL++"],
  requiresNoticesForRedistribution: true,
  allowsCopyleftInRuntime: false,
  allowsRestrictedHumanData: false,
  requiresExportDisclosure: true,
  maxDependencySeverity: "medium",
};

const riskySubmission = {
  id: "submission-risky-cell-model",
  team: "Open Biomarker Lab",
  artifacts: [
    {
      id: "solver-code",
      type: "code",
      license: "AGPL-3.0",
      redistributed: true,
      noticePresent: false,
      exportClassification: "none",
    },
    {
      id: "patient-feature-table",
      type: "dataset",
      license: "DUA-Restricted",
      redistributed: true,
      containsHumanData: true,
      consentForChallenge: false,
      exportClassification: "controlled-biomedical",
    },
    {
      id: "weights",
      type: "model",
      license: "Research-Only",
      redistributed: true,
      commercialUseAllowed: false,
      trainingDataProvenance: "unknown",
      exportClassification: "none",
    },
  ],
  dependencies: [
    {
      name: "bio-csv-parser",
      version: "^2.4.0",
      direct: true,
      license: "MIT",
      advisory: { id: "CVE-2026-1020", severity: "critical", fixedVersion: "2.4.8" },
    },
    {
      name: "plotlab",
      version: "latest",
      direct: true,
      license: "GPL-3.0",
      advisory: null,
    },
    {
      name: "stats-core",
      version: "1.8.2",
      direct: false,
      license: "Apache-2.0",
      advisory: { id: "GHSA-demo-2026", severity: "low", fixedVersion: "1.8.4" },
    },
  ],
  declaredExportControls: [],
  reviewerAccess: {
    sponsorCanDownloadRawData: true,
    sponsorCanDownloadModelWeights: true,
    externalReviewers: ["reviewer-a"],
  },
};

const safeSubmission = {
  id: "submission-clean-biomarker-baseline",
  team: "Reproducible Forecasting Group",
  artifacts: [
    {
      id: "solver-code",
      type: "code",
      license: "Apache-2.0",
      redistributed: true,
      noticePresent: true,
      exportClassification: "none",
    },
    {
      id: "public-feature-table",
      type: "dataset",
      license: "CC-BY-4.0",
      redistributed: true,
      noticePresent: true,
      containsHumanData: false,
      consentForChallenge: true,
      exportClassification: "none",
    },
    {
      id: "baseline-weights",
      type: "model",
      license: "OpenRAIL++",
      redistributed: false,
      commercialUseAllowed: true,
      trainingDataProvenance: "documented",
      exportClassification: "none",
    },
  ],
  dependencies: [
    {
      name: "bio-csv-parser",
      version: "2.4.8",
      direct: true,
      license: "MIT",
      advisory: null,
    },
    {
      name: "stats-core",
      version: "1.8.4",
      direct: true,
      license: "Apache-2.0",
      advisory: null,
    },
  ],
  declaredExportControls: [],
  reviewerAccess: {
    sponsorCanDownloadRawData: false,
    sponsorCanDownloadModelWeights: false,
    externalReviewers: ["reviewer-a"],
  },
};

const conditionalSubmission = {
  id: "submission-notice-followup",
  team: "Careful Methods Group",
  artifacts: [
    {
      id: "solver-code",
      type: "code",
      license: "MIT",
      redistributed: true,
      noticePresent: false,
      exportClassification: "none",
    },
    {
      id: "synthetic-table",
      type: "dataset",
      license: "CC0-1.0",
      redistributed: true,
      containsHumanData: false,
      consentForChallenge: true,
      exportClassification: "none",
    },
  ],
  dependencies: [
    {
      name: "ml-workbench",
      version: "3.2.1",
      direct: true,
      license: "BSD-3-Clause",
      advisory: { id: "GHSA-low-demo", severity: "low", fixedVersion: "3.2.2" },
    },
  ],
  declaredExportControls: [],
  reviewerAccess: {
    sponsorCanDownloadRawData: false,
    sponsorCanDownloadModelWeights: false,
    externalReviewers: ["reviewer-b"],
  },
};

module.exports = {
  challengePolicy,
  riskySubmission,
  safeSubmission,
  conditionalSubmission,
};
