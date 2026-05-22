import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  buildMarkdownPacket,
  buildSvgSummary,
  evaluateSimilarityTriage,
} from "./index.js"
import { similarityTriageInput } from "./sample-data.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const reportsDir = join(__dirname, "reports")
mkdirSync(reportsDir, { recursive: true })

const evaluation = evaluateSimilarityTriage(similarityTriageInput)
writeFileSync(join(reportsDir, "summary.json"), `${JSON.stringify(evaluation, null, 2)}\n`)
writeFileSync(join(reportsDir, "similarity-review-packet.md"), buildMarkdownPacket(evaluation))
writeFileSync(join(reportsDir, "summary.svg"), buildSvgSummary(evaluation))

console.log(`Status: ${evaluation.summary.status}`)
console.log(`Passages reviewed: ${evaluation.summary.passagesReviewed}`)
console.log(`Sources compared: ${evaluation.summary.sourcesCompared}`)
console.log(`Held passages: ${evaluation.summary.heldPassages}`)
console.log(`Revise passages: ${evaluation.summary.revisePassages}`)
console.log(`Clear passages: ${evaluation.summary.clearPassages}`)
console.log(`Accepted methods boilerplate: ${evaluation.summary.acceptedMethodsBoilerplate}`)
console.log(`Critical findings: ${evaluation.summary.criticalFindings}`)
console.log(`Warning findings: ${evaluation.summary.warningFindings}`)
console.log(`Audit digest: ${evaluation.auditDigest}`)
