import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createResearchAssistantPlan } from "../src/planner.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const samplePath = path.join(__dirname, "..", "sample", "corpus.json")
const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"))
const plan = createResearchAssistantPlan(sample)

const topOpportunity = plan.opportunityFeed[0]
const topPlan = plan.replicationPlans[0]
const topFinding = plan.peerReviewReports[0].findings[0]
const weakProject = plan.reproducibilityReports.find((report) => report.status !== "ready")

console.log(`Planner status: ${plan.status}`)
console.log(`Top opportunity: ${topOpportunity.topic}`)
console.log(`Top replication decision: ${topPlan.decision}`)
console.log(`Top peer-review flag: ${topFinding.message}`)
console.log(`Weak reproducibility project: ${weakProject.projectId}`)
console.log(`Audit hash: ${plan.auditHash.slice(0, 16)}...`)
