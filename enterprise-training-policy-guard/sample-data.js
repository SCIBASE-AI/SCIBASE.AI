const cleanPacket = {
  generatedAt: "2026-06-01T18:00:00Z",
  action: {
    id: "enterprise-export-001",
    type: "privileged_export",
    projectId: "proj-open-clinical-reuse",
    department: "Clinical Informatics",
    requiredPolicies: ["data-use", "export-control", "ai-review"],
    requiredTraining: ["human-subjects", "secure-export", "ai-governance"]
  },
  researchers: [
    {
      id: "u-100",
      role: "principal_investigator",
      policies: {
        "data-use": "2026-05-20",
        "export-control": "2026-05-22",
        "ai-review": "2026-05-25"
      },
      training: {
        "human-subjects": { completedAt: "2026-03-01", expiresAt: "2027-03-01", receiptId: "hs-100" },
        "secure-export": { completedAt: "2026-05-02", expiresAt: "2027-05-02", receiptId: "se-100" },
        "ai-governance": { completedAt: "2026-05-05", expiresAt: "2027-05-05", receiptId: "ai-100" }
      }
    },
    {
      id: "u-101",
      role: "data_steward",
      policies: {
        "data-use": "2026-05-18",
        "export-control": "2026-05-18",
        "ai-review": "2026-05-19"
      },
      training: {
        "human-subjects": { completedAt: "2026-02-11", expiresAt: "2027-02-11", receiptId: "hs-101" },
        "secure-export": { completedAt: "2026-04-08", expiresAt: "2027-04-08", receiptId: "se-101" },
        "ai-governance": { completedAt: "2026-04-09", expiresAt: "2027-04-09", receiptId: "ai-101" }
      }
    }
  ]
};

const riskyPacket = {
  generatedAt: "2026-06-01T18:00:00Z",
  action: {
    id: "enterprise-export-002",
    type: "privileged_export",
    projectId: "proj-restricted-genomics",
    department: "Translational Genomics",
    requiredPolicies: ["data-use", "export-control", "ai-review"],
    requiredTraining: ["human-subjects", "secure-export", "ai-governance"]
  },
  researchers: [
    {
      id: "u-200",
      role: "principal_investigator",
      policies: {
        "data-use": "2025-11-15",
        "export-control": "2026-05-01"
      },
      training: {
        "human-subjects": { completedAt: "2025-01-15", expiresAt: "2026-01-15", receiptId: "hs-200" },
        "secure-export": { completedAt: "2026-03-04", expiresAt: "2027-03-04", receiptId: "" },
        "ai-governance": { completedAt: "2026-02-10", expiresAt: "2027-02-10", receiptId: "ai-200" }
      }
    },
    {
      id: "u-201",
      role: "external_collaborator",
      policies: {
        "data-use": "2026-05-15",
        "ai-review": "2026-05-15"
      },
      training: {
        "human-subjects": { completedAt: "2026-05-10", expiresAt: "2027-05-10", receiptId: "hs-201" },
        "ai-governance": { completedAt: "2026-05-12", expiresAt: "2027-05-12", receiptId: "ai-201" }
      }
    }
  ]
};

module.exports = { cleanPacket, riskyPacket };
