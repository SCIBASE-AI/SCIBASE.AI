const cleanPacket = {
  customerId: "nih-policy-insights-synthetic",
  billingDate: "2026-06-01",
  contract: {
    id: "contract-analytics-2026-nih",
    monthlyFeeCents: 120000,
    refreshCadenceDays: 14,
    graceDays: 2,
    minimumCohortSize: 25,
    maxReproducibilityFeedAgeDays: 14,
    requiredMetrics: [
      "citation-network-growth",
      "dataset-reuse-rate",
      "reproducibility-score-index",
      "method-adoption-trends"
    ]
  },
  analyticsProduct: {
    id: "analytics-product-open-science-dashboard",
    snapshot: {
      id: "snapshot-2026-05-25",
      generatedAt: "2026-05-25"
    },
    deliveredMetrics: [
      "citation-network-growth",
      "dataset-reuse-rate",
      "reproducibility-score-index",
      "method-adoption-trends"
    ],
    reproducibilityScoreFeedAt: "2026-05-28",
    segments: [
      {
        id: "segment-neuroscience-data-reuse",
        cohortSize: 82,
        published: true
      },
      {
        id: "segment-climate-model-methods",
        cohortSize: 41,
        published: true
      }
    ],
    sourceProjects: [
      {
        id: "project-synthetic-a",
        includedInSnapshot: true
      },
      {
        id: "project-synthetic-b",
        embargoUntil: "2026-05-10",
        includedInSnapshot: true
      }
    ]
  },
  deliveryEvidence: {
    id: "delivery-portal-2026-05-26",
    deliveredAt: "2026-05-26",
    portalUploadId: "portal-upload-synthetic-9461",
    dashboardSnapshotHash: "sha256:239a6f97d079b7b4",
    exportDigest: "sha256:f3e6cfe420f531ea"
  }
};

const riskyPacket = {
  customerId: "eu-consortium-analytics-synthetic",
  billingDate: "2026-06-01",
  contract: {
    id: "contract-analytics-2026-eu",
    monthlyFeeCents: 180000,
    refreshCadenceDays: 14,
    graceDays: 2,
    minimumCohortSize: 30,
    maxReproducibilityFeedAgeDays: 14,
    requiredMetrics: [
      "citation-network-growth",
      "dataset-reuse-rate",
      "reproducibility-score-index",
      "method-adoption-trends",
      "project-lineage-map"
    ]
  },
  analyticsProduct: {
    id: "analytics-product-funder-trends",
    snapshot: {
      id: "snapshot-2026-05-05",
      generatedAt: "2026-05-05"
    },
    deliveredMetrics: [
      "citation-network-growth",
      "dataset-reuse-rate",
      "method-adoption-trends"
    ],
    reproducibilityScoreFeedAt: "2026-05-10",
    segments: [
      {
        id: "segment-rare-disease-lab-methods",
        cohortSize: 11,
        published: true
      },
      {
        id: "segment-materials-modeling",
        cohortSize: 64,
        published: true
      }
    ],
    sourceProjects: [
      {
        id: "project-withdrawn-lab-notebook",
        withdrawnAt: "2026-05-20",
        includedInSnapshot: true
      },
      {
        id: "project-embargoed-dataset",
        embargoUntil: "2026-06-20",
        includedInSnapshot: true
      }
    ]
  },
  deliveryEvidence: {
    id: "delivery-missing-portal-receipt",
    deliveredAt: "",
    portalUploadId: "",
    dashboardSnapshotHash: "",
    exportDigest: ""
  }
};

module.exports = {
  cleanPacket,
  riskyPacket
};
