import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { sampleRecusalPacket } from "./sample-data.js"
import {
  evaluatePeerReviewRecusals,
  renderStewardPacketMarkdown,
  renderSummarySvg,
} from "./index.js"

const reportsDir = join(process.cwd(), "reports")
mkdirSync(reportsDir, { recursive: true })

const result = evaluatePeerReviewRecusals(sampleRecusalPacket)
writeFileSync(join(reportsDir, "summary.json"), `${JSON.stringify(result, null, 2)}\n`)
writeFileSync(join(reportsDir, "steward-packet.md"), renderStewardPacketMarkdown(result))
writeFileSync(join(reportsDir, "summary.svg"), renderSummarySvg(result))

console.log(JSON.stringify(result.summary, null, 2))
