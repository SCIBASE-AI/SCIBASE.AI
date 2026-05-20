const badgePolicy = {
  generatedAt: "2026-05-20",
  renewalWindowsDays: {
    "Trusted Reviewer": 120,
    "Open Science Champion": 180,
    "Reproducibility Steward": 150,
  },
  minimums: {
    "Trusted Reviewer": {
      reviews: 4,
      averageReviewQuality: 0.82,
      reproducibilityEvents: 1,
      creditEvents: 2,
    },
    "Open Science Champion": {
      reviews: 2,
      averageReviewQuality: 0.75,
      reproducibilityEvents: 2,
      creditEvents: 4,
    },
    "Reproducibility Steward": {
      reviews: 1,
      averageReviewQuality: 0.7,
      reproducibilityEvents: 3,
      creditEvents: 2,
    },
  },
};

const researchers = [
  {
    id: "orcid:0000-0002-1825-0097",
    displayName: "Dr. Amina Rios",
    activeBadges: ["Trusted Reviewer", "Reproducibility Steward"],
    reviewEvents: [
      { id: "rev-100", daysAgo: 14, quality: 0.91, mode: "public", actionableComments: 9 },
      { id: "rev-101", daysAgo: 34, quality: 0.88, mode: "semi-private", actionableComments: 7 },
      { id: "rev-102", daysAgo: 61, quality: 0.86, mode: "anonymous", actionableComments: 8 },
      { id: "rev-103", daysAgo: 92, quality: 0.84, mode: "double-blind", actionableComments: 6 },
    ],
    reproducibilityEvents: [
      { id: "rep-10", daysAgo: 21, status: "verified", project: "dose-response-v2" },
      { id: "rep-11", daysAgo: 73, status: "verified", project: "notebook-rerun" },
      { id: "rep-12", daysAgo: 118, status: "verified", project: "model-card-check" },
    ],
    creditEvents: [
      { id: "cred-1", daysAgo: 18, role: "Data Curation" },
      { id: "cred-2", daysAgo: 42, role: "Software" },
      { id: "cred-3", daysAgo: 64, role: "Validation" },
    ],
    appeals: [],
  },
  {
    id: "orcid:0000-0003-1415-9265",
    displayName: "Prof. Luc Chen",
    activeBadges: ["Trusted Reviewer", "Open Science Champion"],
    reviewEvents: [
      { id: "rev-200", daysAgo: 160, quality: 0.78, mode: "public", actionableComments: 4 },
      { id: "rev-201", daysAgo: 201, quality: 0.74, mode: "anonymous", actionableComments: 3 },
    ],
    reproducibilityEvents: [
      { id: "rep-20", daysAgo: 220, status: "verified", project: "legacy-rerun" },
    ],
    creditEvents: [
      { id: "cred-20", daysAgo: 170, role: "Supervision" },
      { id: "cred-21", daysAgo: 240, role: "Methodology" },
    ],
    appeals: [
      {
        id: "appeal-7",
        status: "open",
        reason: "review quality dispute",
        daysAgo: 12,
      },
    ],
  },
  {
    id: "orcid:0000-0004-9999-1234",
    displayName: "Dr. Noor Patel",
    activeBadges: ["Open Science Champion"],
    reviewEvents: [
      { id: "rev-300", daysAgo: 330, quality: 0.69, mode: "public", actionableComments: 2 },
    ],
    reproducibilityEvents: [],
    creditEvents: [
      { id: "cred-30", daysAgo: 365, role: "Writing" },
    ],
    appeals: [],
  },
];

module.exports = { badgePolicy, researchers };
