const sampleUserContext = {
  userId: "researcher-demo",
  institutionId: "north-atlas-university",
  intendedUse: "cross_project_reuse",
  hasActiveIrbProtocol: true,
  hasDataUseAgreement: false,
  biosafetyClearanceLevel: 1,
  hasAnimalCareProtocol: false,
  ethicsTraining: ["human-subjects"],
}

const sampleRecommendations = [
  {
    id: "rec-safe-open-protocol",
    title: "Reuse the public microscopy segmentation protocol",
    rationale: "Protocol and dataset are public, non-human, non-animal, and low biosafety risk.",
    nodes: [
      {
        id: "protocol-micro-001",
        type: "Protocol",
        name: "Open microscopy segmentation workflow",
      },
      {
        id: "dataset-cells-public",
        type: "Dataset",
        name: "Public yeast cell image set",
      },
    ],
    evidence: [
      {
        id: "ev-open-protocol",
        source: "protocol DOI 10.1000/open-micro",
        status: "active",
        subjectType: "non-human",
        consentScope: ["open_reuse", "methods_training"],
        requestedScope: "open_reuse",
        biosafetyLevel: 1,
        dualUseRisk: "none",
        dataUse: "open",
      },
    ],
  },
  {
    id: "rec-human-cohort-transfer",
    title: "Connect cohort assay data to an external replication notebook",
    rationale: "The graph finds a strong concept-method match, but reuse expands beyond the consent scope.",
    nodes: [
      {
        id: "dataset-human-cohort",
        type: "Dataset",
        name: "Longitudinal immune response cohort",
      },
      {
        id: "notebook-replication",
        type: "Notebook",
        name: "External immune model replication notebook",
      },
    ],
    evidence: [
      {
        id: "ev-human-consent",
        source: "IRB packet IRB-2025-1442",
        status: "active",
        subjectType: "human",
        irbApproval: "IRB-2025-1442",
        consentScope: ["internal_validation"],
        requestedScope: "cross_project_reuse",
        biosafetyLevel: 1,
        dualUseRisk: "none",
        dataUse: "restricted",
      },
    ],
  },
  {
    id: "rec-bsl2-protocol",
    title: "Suggest BSL-2 viral vector protocol for wet-lab follow-up",
    rationale: "The graph route is scientifically relevant, but the user context lacks the required clearance.",
    nodes: [
      {
        id: "protocol-bsl2-vector",
        type: "Protocol",
        name: "BSL-2 viral vector transduction protocol",
      },
    ],
    evidence: [
      {
        id: "ev-bsl2-protocol",
        source: "protocol DOI 10.1000/bsl2-vector",
        status: "active",
        subjectType: "non-human",
        consentScope: ["methods_training"],
        requestedScope: "methods_training",
        biosafetyLevel: 2,
        dualUseRisk: "review",
        dataUse: "open",
      },
    ],
  },
  {
    id: "rec-animal-study",
    title: "Recommend animal-model replication path",
    rationale: "The method is reusable only after animal-care protocol evidence is attached.",
    nodes: [
      {
        id: "study-animal-model",
        type: "Paper",
        name: "Rodent wound healing replication study",
      },
    ],
    evidence: [
      {
        id: "ev-animal-care",
        source: "IACUC pending packet",
        status: "active",
        subjectType: "animal",
        consentScope: ["replication"],
        requestedScope: "replication",
        biosafetyLevel: 1,
        animalProtocol: null,
        dualUseRisk: "none",
        dataUse: "open",
      },
    ],
  },
]

module.exports = {
  sampleRecommendations,
  sampleUserContext,
}
