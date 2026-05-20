"use strict";

module.exports = [
  {
    id: "IC-2026-NORTHBRIDGE",
    customer: "Northbridge University Consortium",
    asOf: "2026-05-20",
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
    commitments: {
      subscription: 120000,
      compute: 85000,
      analytics: 60000,
    },
    thresholds: {
      marginFloorPercent: 38,
      creditExpirationWindowDays: 60,
    },
    creditPools: [
      {
        id: "NB-COMPUTE-SPRING",
        stream: "compute",
        remainingUsd: 9200,
        expiresOn: "2026-06-21",
      },
    ],
    usage: [
      {
        id: "NB-SUB-001",
        stream: "subscription",
        amountUsd: 46300,
        grossMarginPercent: 82,
        description: "Research group seats through May",
      },
      {
        id: "NB-COMP-042",
        stream: "compute",
        amountUsd: 61200,
        grossMarginPercent: 36,
        description: "Reproducibility job cluster and model inference",
      },
      {
        id: "NB-LIC-008",
        stream: "analytics",
        amountUsd: 12300,
        grossMarginPercent: 71,
        description: "Dataset reuse dashboard exports",
      },
    ],
  },
  {
    id: "IC-2026-BIOMESA",
    customer: "BioMesa Translational Lab",
    asOf: "2026-05-20",
    periodStart: "2026-02-01",
    periodEnd: "2027-01-31",
    commitments: {
      subscription: 45000,
      compute: 40000,
      analytics: 15000,
    },
    thresholds: {
      marginFloorPercent: 35,
      creditExpirationWindowDays: 45,
    },
    creditPools: [],
    usage: [
      {
        id: "BM-SUB-002",
        stream: "subscription",
        amountUsd: 16300,
        grossMarginPercent: 80,
        description: "Lab workspace seats",
      },
      {
        id: "BM-COMP-011",
        stream: "compute",
        amountUsd: 12700,
        grossMarginPercent: 49,
        description: "Notebook reruns and summarization jobs",
      },
      {
        id: "BM-LIC-003",
        stream: "analytics",
        amountUsd: 5200,
        grossMarginPercent: 72,
        description: "Citation network API package",
      },
    ],
  },
  {
    id: "IC-2026-HELIX",
    customer: "Helix Methods Institute",
    asOf: "2026-05-20",
    periodStart: "2026-03-01",
    periodEnd: "2026-08-31",
    commitments: {
      subscription: 28000,
      compute: 22000,
      analytics: 32000,
    },
    thresholds: {
      marginFloorPercent: 42,
      creditExpirationWindowDays: 50,
    },
    creditPools: [
      {
        id: "HX-ANALYTICS-PILOT",
        stream: "analytics",
        remainingUsd: 14800,
        expiresOn: "2026-06-12",
      },
    ],
    usage: [
      {
        id: "HX-SUB-001",
        stream: "subscription",
        amountUsd: 10800,
        grossMarginPercent: 79,
        description: "Institutional pilot seats",
      },
      {
        id: "HX-COMP-007",
        stream: "compute",
        amountUsd: 18400,
        grossMarginPercent: 29,
        description: "GPU-backed peer review batch jobs",
      },
      {
        id: "HX-LIC-002",
        stream: "analytics",
        amountUsd: 2900,
        grossMarginPercent: 69,
        description: "White-labeled reproducibility trend export",
      },
    ],
  },
];
