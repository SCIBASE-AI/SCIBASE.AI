import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  buildMarkdownPacket,
  buildSvgSummary,
  evaluateEvidenceBinding,
} from "./index.js"
import { evidenceBindingInput } from "./sample-data.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const reportsDir = join(__dirname, "reports")
mkdirSync(reportsDir, { recursive: true })

const evaluation = evaluateEvidenceBinding(evidenceBindingInput)
writeFileSync(join(reportsDir, "summary.json"), `${JSON.stringify(evaluation, null, 2)}\n`)
writeFileSync(join(reportsDir, "evidence-binding-review-packet.md"), buildMarkdownPacket(evaluation))
writeFileSync(join(reportsDir, "summary.svg"), buildSvgSummary(evaluation))

console.log(`Status: ${evaluation.summary.status}`)
console.log(`Claims reviewed: ${evaluation.summary.claimsReviewed}`)
console.log(`Claims held: ${evaluation.summary.claimsHeld}`)
console.log(`Assets reviewed: ${evaluation.summary.assetsReviewed}`)
console.log(`Assets held: ${evaluation.summary.assetsHeld}`)
console.log(`Evidence anchors reviewed: ${evaluation.summary.evidenceAnchorsReviewed}`)
console.log(`Current evidence anchors: ${evaluation.summary.currentEvidenceAnchors}`)
console.log(`Critical findings: ${evaluation.summary.criticalFindings}`)
console.log(`High findings: ${evaluation.summary.highFindings}`)
console.log(`Reviewer actions: ${evaluation.summary.reviewerActions}`)
console.log(`Audit digest: ${evaluation.auditDigest}`)
