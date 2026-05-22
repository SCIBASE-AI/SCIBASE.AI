const tonePolicy = {
  alpha: 0.05,
  evidenceRank: {
    "expert-opinion": 1,
    "case-series": 2,
    "observational": 3,
    "controlled-experiment": 4,
    "randomized-controlled": 5,
    "systematic-review": 6,
  },
  lowEvidenceRank: 3,
  minEvidenceRankForCausalClaim: 5,
  minEvidenceRankForDefinitiveClaim: 5,
  minContextsForUniversalClaim: 3,
  minSampleForBroadPopulationClaim: 120,
  overconfidentTerms: ["proves", "definitively", "guarantees", "eliminates", "settles"],
  universalTerms: ["always", "all patients", "all users", "never fails", "across every"],
  causalTerms: ["causes", "caused", "prevents", "eliminates", "drives", "leads to"],
  significanceTerms: ["significant", "statistically significant", "robust effect"],
  uncertaintyTerms: ["may", "might", "suggests", "is associated with", "appears", "in this cohort"],
  broadScopeTerms: ["patients", "clinicians", "researchers", "all users", "population-wide"],
}

const manuscripts = [
  {
    id: "MT-PASS-001",
    title: "Calibrated language for randomized medication adherence trial",
    field: "clinical informatics",
    evidence: [
      { id: "EV-RCT-PRIMARY", strength: "randomized-controlled", description: "Two-arm randomized trial with prespecified endpoint." },
      { id: "EV-REPLICATION", strength: "controlled-experiment", description: "External site replication packet." },
    ],
    claims: [
      {
        id: "CLM-1",
        section: "Results",
        intent: "causal",
        text: "The intervention may reduce missed medication reminders in this cohort.",
        evidenceIds: ["EV-RCT-PRIMARY", "EV-REPLICATION"],
        sampleSize: 214,
        pValue: 0.018,
        confidenceInterval: "risk ratio 0.74, 95% CI 0.60-0.91",
        replicationContexts: ["clinic-a", "clinic-b", "clinic-c"],
        limitationsLinked: true,
      },
    ],
  },
  {
    id: "MT-HOLD-002",
    title: "Observational nutrition dashboard draft",
    field: "public health",
    evidence: [
      { id: "EV-OBS-COHORT", strength: "observational", description: "Single-site retrospective cohort." },
    ],
    claims: [
      {
        id: "CLM-2",
        section: "Abstract",
        intent: "causal",
        text: "The dashboard proves the intervention eliminates readmission risk for all patients.",
        evidenceIds: ["EV-OBS-COHORT"],
        sampleSize: 47,
        pValue: 0.08,
        confidenceInterval: null,
        replicationContexts: ["single-hospital"],
        limitationsLinked: false,
      },
    ],
  },
  {
    id: "MT-REV-003",
    title: "Pilot assay automation manuscript",
    field: "bioengineering",
    evidence: [
      { id: "EV-PILOT", strength: "controlled-experiment", description: "Bench assay pilot with two batches." },
    ],
    claims: [
      {
        id: "CLM-3",
        section: "Discussion",
        intent: "associational",
        text: "The workflow shows a significant improvement in calibration throughput for researchers.",
        evidenceIds: ["EV-PILOT"],
        sampleSize: 32,
        pValue: 0.031,
        confidenceInterval: null,
        replicationContexts: ["bench-a", "bench-b"],
        limitationsLinked: true,
      },
    ],
  },
  {
    id: "MT-HOLD-004",
    title: "Citation-free AI literature overview",
    field: "machine learning",
    evidence: [],
    claims: [
      {
        id: "CLM-4",
        section: "Key findings",
        intent: "summative",
        text: "The method definitively settles benchmark uncertainty across every model family.",
        evidenceIds: [],
        sampleSize: 0,
        pValue: null,
        confidenceInterval: null,
        replicationContexts: [],
        limitationsLinked: false,
      },
    ],
  },
]

module.exports = { manuscripts, tonePolicy }
