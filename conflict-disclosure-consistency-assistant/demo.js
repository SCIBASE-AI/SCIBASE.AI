import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  buildMarkdownPacket,
  buildSvgSummary,
  dollarsFor,
  evaluateDisclosureConsistency,
} from "./index.js"
import { projects } from "./sample-data.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const reportsDir = join(__dirname, "reports")
mkdirSync(reportsDir, { recursive: true })

const evaluation = evaluateDisclosureConsistency(projects)
writeFileSync(join(reportsDir, "summary.json"), `${JSON.stringify(evaluation, null, 2)}\n`)
writeFileSync(join(reportsDir, "disclosure-review-packet.md"), buildMarkdownPacket(evaluation))
writeFileSync(join(reportsDir, "summary.svg"), buildSvgSummary(evaluation))

console.log(`Status: ${evaluation.summary.status}`)
console.log(`Projects reviewed: ${evaluation.summary.projectsReviewed}`)
console.log(`Held projects: ${evaluation.summary.heldProjects}`)
console.log(`Ready projects: ${evaluation.summary.readyProjects}`)
console.log(`Affected authors: ${evaluation.summary.affectedAuthors}`)
console.log(`Undisclosed funding: $${dollarsFor(evaluation.summary.undisclosedFundingCents)}`)
console.log(`Critical findings: ${evaluation.summary.criticalFindings}`)
console.log(`Warning findings: ${evaluation.summary.warningFindings}`)
console.log(`Audit digest: ${evaluation.auditDigest}`)
