const reviewContext = {
  reviewDate: "2026-05-28T00:00:00Z",
};

const riskyProtocol = {
  id: "protocol-neuro-042",
  registrationId: "OSF-SYNTH-042",
  registeredAt: "2026-01-15T00:00:00Z",
  endpoints: [
    { id: "memory-score", role: "primary" },
    { id: "reaction-time", role: "secondary" },
  ],
  analysisPlan: {
    models: [
      { id: "linear-mixed-model" },
      { id: "preplanned-age-adjustment" },
    ],
  },
  exclusionCriteria: ["withdrawn-consent", "device-failure"],
  amendments: [
    { id: "amend-1", timestamp: "2026-03-10T00:00:00Z" },
    { id: "amend-late", timestamp: "2026-05-01T00:00:00Z" },
  ],
};

const riskyManuscript = {
  id: "manuscript-neuro-042",
  firstEnrollmentAt: "2026-01-20T00:00:00Z",
  endpoints: [
    { id: "memory-score", role: "secondary" },
    { id: "neural-response", role: "primary" },
  ],
  analysis: {
    models: [
      { id: "linear-mixed-model" },
      { id: "posthoc-random-forest", tuningAfterOutcomeReview: true, amendmentId: "" },
    ],
  },
  exclusions: [
    { reason: "withdrawn-consent", count: 3, afterOutcomeReview: false, blindedReview: true },
    { reason: "low-response-cluster", count: 18, afterOutcomeReview: true, blindedReview: false },
  ],
  declaredAmendments: [
    { id: "amend-late", analysisStartedAt: "2026-04-15T00:00:00Z" },
    { id: "amend-missing", analysisStartedAt: "2026-04-01T00:00:00Z" },
  ],
  aiSummary: {
    confidence: "high",
    includesProtocolCaveat: false,
  },
};

const alignedProtocol = {
  id: "protocol-catalyst-101",
  registrationId: "OSF-SYNTH-101",
  registeredAt: "2026-01-01T00:00:00Z",
  endpoints: [
    { id: "yield", role: "primary" },
    { id: "stability", role: "secondary" },
  ],
  analysisPlan: {
    models: [
      { id: "linear-regression" },
    ],
  },
  exclusionCriteria: ["instrument-failure"],
  amendments: [
    { id: "amend-1", timestamp: "2026-02-01T00:00:00Z" },
  ],
};

const alignedManuscript = {
  id: "manuscript-catalyst-101",
  firstEnrollmentAt: "2026-01-10T00:00:00Z",
  endpoints: [
    { id: "yield", role: "primary" },
    { id: "stability", role: "secondary" },
  ],
  analysis: {
    models: [
      { id: "linear-regression" },
    ],
  },
  exclusions: [
    { reason: "instrument-failure", count: 1, afterOutcomeReview: false, blindedReview: true },
  ],
  declaredAmendments: [
    { id: "amend-1", analysisStartedAt: "2026-03-01T00:00:00Z" },
  ],
  aiSummary: {
    confidence: "medium",
    includesProtocolCaveat: true,
  },
};

module.exports = {
  alignedManuscript,
  alignedProtocol,
  reviewContext,
  riskyManuscript,
  riskyProtocol,
};
