import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { sampleGovernancePacket } from "./sample-data.js"
import {
  evaluateServiceTokenGovernance,
  renderOwnerReviewMarkdown,
  renderSummarySvg,
} from "./index.js"

const reportsDir = join(process.cwd(), "reports")
mkdirSync(reportsDir, { recursive: true })

const result = evaluateServiceTokenGovernance(sampleGovernancePacket)
writeFileSync(join(reportsDir, "summary.json"), `${JSON.stringify(result, null, 2)}\n`)
writeFileSync(join(reportsDir, "owner-review-packet.md"), renderOwnerReviewMarkdown(result))
writeFileSync(join(reportsDir, "summary.svg"), renderSummarySvg(result))

console.log(JSON.stringify(result.summary, null, 2))
