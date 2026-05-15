import fs from "node:fs"
import workspace from "../data/sample-workspace.json" with { type: "json" }
import { evaluateComputeMargins } from "../src/compute-margin-guard.js"

fs.mkdirSync("docs", { recursive: true })

const packet = evaluateComputeMargins(workspace)
fs.writeFileSync("docs/demo-output.json", `${JSON.stringify(packet, null, 2)}\n`)

const holdReasons = packet.accounts.flatMap((account) => account.holdReasons)
const reasonCounts = Object.fromEntries([...new Set(holdReasons)].sort().map((reason) => [
  reason,
  holdReasons.filter((candidate) => candidate === reason).length
]))

const transcript = [
  "# AI Compute Margin Guard Demo",
  "",
  `Generated: ${workspace.asOfDate}`,
  "",
  "## Summary",
  "",
  `- Accounts evaluated: ${packet.totals.accountCount}`,
  `- Accounts on hold: ${packet.totals.holdCount}`,
  `- Total recognized compute revenue: $${packet.totals.totalRevenueUsd}`,
  `- Total known cloud cost: $${packet.totals.totalKnownCostUsd}`,
  `- Portfolio gross margin: ${packet.totals.totalGrossMarginPct}%`,
  `- Unknown provider SKUs: ${packet.totals.unknownSkuCount}`,
  `- Route recommendations: ${packet.routeRecommendations.length}`,
  "",
  "## Hold reasons",
  "",
  ...Object.entries(reasonCounts).map(([reason, count]) => `- ${reason}: ${count}`),
  "",
  "## Reviewer checklist",
  "",
  ...packet.reviewerChecklist.map((item) => `- ${item}`)
]

fs.writeFileSync("docs/demo-transcript.md", `${transcript.join("\n")}\n`)
console.log(transcript.join("\n"))
