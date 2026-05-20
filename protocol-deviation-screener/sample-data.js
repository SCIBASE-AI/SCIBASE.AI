const protocol = {
  id: "NCT-GLUCO-42",
  title: "Continuous Glucose Coaching for Shift Workers",
  registeredDate: "2025-02-10",
  primaryOutcomes: ["mean overnight glucose variability"],
  secondaryOutcomes: ["sleep efficiency", "reported fatigue"],
  plannedAnalyses: ["mixed effects model", "intention-to-treat"],
  plannedSampleSize: 180,
  exclusionRules: ["diagnosed diabetes", "night-shift tenure under 3 months"],
  citations: [
    {
      id: "trial-registry",
      title: "Continuous Glucose Coaching for Shift Workers protocol",
      authors: ["Mira Shah", "Anton Bell"],
      year: 2025,
      doi: "10.5555/gluco-protocol",
      url: "https://registry.example/gluco-42",
    },
  ],
}

const riskyManuscript = {
  title: "Glucose Coaching Improves Fatigue in Shift Workers",
  abstract:
    "We report a randomized workplace trial where fatigue was the primary endpoint and glucose variability improved in exploratory analyses.",
  methods:
    "The trial excluded participants after randomization for app non-use and analyzed completers with a per-protocol model.",
  reportedPrimaryOutcomes: ["reported fatigue"],
  reportedSecondaryOutcomes: ["mean overnight glucose variability"],
  analysisMethods: ["per-protocol model"],
  sampleSize: 126,
  references: ["RANDOM-WORKPLACE-REVIEW"],
  evidenceSpans: {
    endpoint: "fatigue was the primary endpoint",
    analysis: "analyzed completers with a per-protocol model",
    exclusions: "excluded participants after randomization for app non-use",
  },
}

const alignedManuscript = {
  title: "Glucose Coaching and Overnight Glucose Variability",
  abstract:
    "We report the registered primary endpoint, mean overnight glucose variability, with sleep efficiency and reported fatigue as secondary endpoints.",
  methods:
    "The analysis followed the registered intention-to-treat mixed effects model with planned exclusions only.",
  reportedPrimaryOutcomes: ["mean overnight glucose variability"],
  reportedSecondaryOutcomes: ["sleep efficiency", "reported fatigue"],
  analysisMethods: ["mixed effects model", "intention-to-treat"],
  sampleSize: 182,
  references: ["trial-registry"],
  evidenceSpans: {
    endpoint: "registered primary endpoint, mean overnight glucose variability",
    analysis: "registered intention-to-treat mixed effects model",
  },
}

module.exports = {
  protocol,
  riskyManuscript,
  alignedManuscript,
}
