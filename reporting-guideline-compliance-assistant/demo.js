const fs = require("node:fs")
const path = require("node:path")
const { auditResearchPackage } = require("./index")

const audit = auditResearchPackage({
  studyType: "clinical_trial",
  manuscript: {
    title: "Remote monitoring intervention for hypertension",
    abstract:
      "A randomized trial tested a remote monitoring dashboard for blood pressure control over 12 weeks.",
    methods:
      "Participants were randomized into dashboard and usual-care groups. The protocol was preregistered.",
    results:
      "The dashboard group improved systolic blood pressure by 4 mmHg. Safety outcomes were summarized.",
  },
  artifacts: {
    dataset: "synthetic-bp-trial.csv",
    analysisCode: "analysis/bp-trial-analysis.js",
    protocol: "trial-protocol-v1.pdf",
  },
})

const outputPath = path.join(__dirname, "demo-output.json")
fs.writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`)

console.log("Reporting Guideline Compliance Assistant demo")
console.log(`Guideline: ${audit.guideline.id}`)
console.log(`Readiness: ${audit.readiness.gate} (${audit.readiness.score})`)
console.log(`Guideline score: ${audit.scores.guideline}`)
console.log(`Reproducibility score: ${audit.scores.reproducibility}`)
console.log("Top reviewer actions:")
for (const action of audit.reviewerPacket.revisionActions.slice(0, 4)) {
  console.log(`- ${action}`)
}
console.log(`Wrote ${outputPath}`)
