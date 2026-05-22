import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  buildMarkdownPacket,
  buildSvgSummary,
  evaluateDepositReconciliation,
} from "./index.js"
import { exportPackages } from "./sample-data.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const reportsDir = join(__dirname, "reports")
mkdirSync(reportsDir, { recursive: true })

const evaluation = evaluateDepositReconciliation(exportPackages)
writeFileSync(join(reportsDir, "summary.json"), `${JSON.stringify(evaluation, null, 2)}\n`)
writeFileSync(join(reportsDir, "deposit-reconciliation-packet.md"), buildMarkdownPacket(evaluation))
writeFileSync(join(reportsDir, "summary.svg"), buildSvgSummary(evaluation))

console.log(`Status: ${evaluation.summary.status}`)
console.log(`Packages reviewed: ${evaluation.summary.packagesReviewed}`)
console.log(`Deposit targets reviewed: ${evaluation.summary.depositTargetsReviewed}`)
console.log(`Verified targets: ${evaluation.summary.verifiedTargets}`)
console.log(`Follow-up targets: ${evaluation.summary.followUpTargets}`)
console.log(`Held targets: ${evaluation.summary.heldTargets}`)
console.log(`Critical findings: ${evaluation.summary.criticalFindings}`)
console.log(`Warning findings: ${evaluation.summary.warningFindings}`)
console.log(`Audit digest: ${evaluation.auditDigest}`)
