const policy = {
  allowedRegions: ["US", "EU", "CA"],
  maxSecurityReviewAgeDays: 365,
  maxBreachNoticeHours: 72,
  restrictedDataClasses: ["phi", "student_records", "human_subjects"],
  requiredRestrictedAgreements: {
    phi: "baa",
    student_records: "dua",
    human_subjects: "dua",
  },
};

const vendorRequests = [
  {
    id: "vendor-zenith-archive",
    vendorName: "Zenith Archive",
    owner: "Enterprise Integrations",
    region: "EU",
    dataClasses: ["publications", "student_records"],
    dpa: { status: "active", signedAt: "2026-01-12" },
    agreements: ["dpa", "dua", "scc"],
    subprocessors: [
      { name: "Northwind Storage", approved: true, region: "EU" },
      { name: "Atlas Queue", approved: true, region: "US" },
    ],
    breachNoticeHours: 48,
    securityReview: { completedAt: "2026-03-01", reviewer: "Security Office" },
    requestedAt: "2026-05-23",
  },
  {
    id: "vendor-crossborder-notebook",
    vendorName: "Crossborder Notebook",
    owner: "Research Systems",
    region: "US",
    dataClasses: ["student_records"],
    dpa: { status: "active", signedAt: "2026-02-09" },
    agreements: ["dpa", "dua"],
    subprocessors: [
      { name: "Regional Search", approved: true, region: "APAC" },
    ],
    breachNoticeHours: 72,
    securityReview: { completedAt: "2026-04-15", reviewer: "Security Office" },
    requestedAt: "2026-05-23",
  },
  {
    id: "vendor-risky-lab-ai",
    vendorName: "Risky Lab AI",
    owner: "",
    region: "APAC",
    dataClasses: ["phi", "student_records"],
    dpa: { status: "expired", signedAt: "2024-01-01" },
    agreements: ["dpa"],
    subprocessors: [
      { name: "Shadow Analytics", approved: false, region: "APAC" },
    ],
    breachNoticeHours: 120,
    securityReview: { completedAt: "2024-01-01", reviewer: "" },
    requestedAt: "2026-05-23",
  },
];

module.exports = {
  policy,
  vendorRequests,
};
