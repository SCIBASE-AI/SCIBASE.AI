const assert = require("assert")

const {
  screenProtocolDeviation,
  buildSummaryModes,
  formatCitation,
  createAuditDigest,
} = require("./index")

const registeredProtocol = {
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

const riskyAudit = screenProtocolDeviation(registeredProtocol, riskyManuscript)
const alignedAudit = screenProtocolDeviation(registeredProtocol, alignedManuscript)

assert.equal(riskyAudit.readyForReview, false)
assert.equal(alignedAudit.readyForReview, true)

assert.deepEqual(
  riskyAudit.flags.map((flag) => flag.code),
  [
    "PRIMARY_OUTCOME_SWITCH",
    "UNREGISTERED_PRIMARY_OUTCOME",
    "ANALYSIS_PLAN_DRIFT",
    "SAMPLE_SIZE_SHORTFALL",
    "UNPLANNED_EXCLUSION",
    "MISSING_PROTOCOL_CITATION",
  ],
)

assert.equal(riskyAudit.flags[0].severity, "high")
assert.ok(riskyAudit.reviewerTasks.some((task) => task.includes("outcome-switch")))
assert.ok(riskyAudit.citationRecommendations[0].reason.includes("registered protocol"))

const summaries = buildSummaryModes(riskyAudit)
assert.ok(summaries.abstractStyle.includes("Primary outcome drift"))
assert.ok(summaries.executiveSummary.includes("6 protocol risk flags"))
assert.ok(summaries.laypersonExplanation.includes("changed from the original study plan"))
assert.ok(summaries.evidenceSpans.some((span) => span.source === "manuscript.methods"))

assert.equal(
  formatCitation(registeredProtocol.citations[0], "nature"),
  "Shah M.; Bell A. Continuous Glucose Coaching for Shift Workers protocol (2025). doi:10.5555/gluco-protocol",
)

assert.equal(
  createAuditDigest(riskyAudit),
  createAuditDigest(screenProtocolDeviation(registeredProtocol, riskyManuscript)),
)

console.log("protocol-deviation-screener tests passed")
