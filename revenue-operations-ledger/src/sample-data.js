export const plans = [
  {
    id: "individual-pro",
    audience: "individual",
    monthlyUsd: 29,
    annualUsd: 290,
    includedSeats: 1,
    includedAiCredits: 1200,
    features: ["private-projects", "extra-ai-tokens", "project-analytics"]
  },
  {
    id: "lab-team",
    audience: "lab",
    monthlyUsd: 249,
    annualUsd: 2490,
    includedSeats: 8,
    includedAiCredits: 16000,
    features: ["shared-projects", "group-permissions", "priority-support", "private-data-spaces"]
  },
  {
    id: "institutional",
    audience: "institution",
    monthlyUsd: 2400,
    annualUsd: 24000,
    includedSeats: 100,
    includedAiCredits: 250000,
    features: ["admin-dashboards", "custom-integrations", "saml", "sla", "analytics-license-option"]
  }
];

export const customer = {
  id: "cust-northbridge-lab",
  name: "Northbridge Organoid Lab",
  planId: "lab-team",
  billingCycle: "annual",
  seats: 14,
  paymentProvider: "institutional-invoice",
  taxRate: 0.0825,
  promotion: { type: "consortium", percentOff: 12, code: "CONSORTIUM-2026" }
};

export const usageEvents = [
  { id: "u-1", meter: "ai-inference", units: 4200, unitUsd: 0.002, projectId: "project-organoid-response" },
  { id: "u-2", meter: "reproducibility-job", units: 18, unitUsd: 1.75, projectId: "project-organoid-response" },
  { id: "u-3", meter: "model-training-hour", units: 7, unitUsd: 8.5, projectId: "project-biomarker-ranking" },
  { id: "u-4", meter: "deployment-hour", units: 40, unitUsd: 0.18, projectId: "project-biomarker-ranking" }
];

export const topUps = [
  { id: "topup-1", credits: 5000, amountUsd: 49, purchasedAt: "2026-05-01T10:00:00Z" }
];

export const analyticsDataset = {
  id: "analytics-science-trends-2026-05",
  customerType: "government-policy",
  fields: ["topic_trend", "citation_network", "dataset_reuse_count", "reproducibility_score", "method_usage"],
  excludedFields: ["private_content", "raw_manuscript", "personal_email", "restricted_dataset"],
  rows: 12840,
  licenseUsd: 1800
};
