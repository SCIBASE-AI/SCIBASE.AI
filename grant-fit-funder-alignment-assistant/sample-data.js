"use strict";

const grantPacket = {
  projectTitle: "Open Replication Map for Low-Resource Clinical NLP",
  manuscriptStage: "pre-submission",
  requestedAmountUsd: 185000,
  funder: {
    name: "Frontier Open Science Fund",
    priorities: [
      "open science",
      "reproducibility",
      "low-resource settings",
      "clinical impact",
      "capacity building",
    ],
    hardConstraints: {
      maxBudgetUsd: 200000,
      requiresHumanSubjectsPlan: true,
      requiresOpenArtifacts: true,
      allowsClinicalData: true,
    },
  },
  proposal: {
    aims: [
      "Build an open science multilingual benchmark for de-identified clinical NLP replication.",
      "Publish reusable evaluation notebooks and model cards for every baseline.",
      "Train local research stewards to maintain replication evidence.",
    ],
    impactStatement:
      "The work improves reproducibility in hospitals serving low-resource languages and reduces duplicated evaluation effort.",
    beneficiaries: ["hospital data teams", "clinical NLP researchers", "local research stewards"],
    artifacts: [
      { name: "analysis notebooks", status: "ready", open: true },
      { name: "de-identification protocol", status: "draft", open: true },
      { name: "model cards", status: "ready", open: true },
      { name: "replication dashboard", status: "planned", open: true },
    ],
    ethics: {
      humanSubjects: true,
      irbStatus: "conditional approval",
      consentPlan: "waiver documented for retrospective de-identified notes",
      dataProtectionPlan: "encrypted enclave with role-based export review",
    },
    budgetLines: [
      { category: "personnel", amountUsd: 102000, justification: "local steward and analyst time" },
      { category: "cloud compute", amountUsd: 28000, justification: "baseline reruns and secure notebook hosting" },
      { category: "community training", amountUsd: 22000, justification: "workshops for low-resource hospital partners" },
      { category: "publication", amountUsd: 18000, justification: "open access and artifact DOI fees" },
      { category: "contingency", amountUsd: 15000, justification: "" },
    ],
    evidenceClaims: [
      { claim: "Open notebooks are ready for two pilot cohorts.", evidenceId: "EV-001" },
      { claim: "IRB approval is complete.", evidenceId: "EV-002" },
      { claim: "The dashboard will reduce duplicate evaluation work.", evidenceId: "" },
    ],
    evidenceLibrary: [
      { id: "EV-001", type: "repository", label: "pilot notebook commit hash" },
      { id: "EV-002", type: "ethics letter", label: "conditional approval memo" },
      { id: "EV-003", type: "partner letter", label: "hospital steward training commitment" },
    ],
  },
};

module.exports = { grantPacket };
