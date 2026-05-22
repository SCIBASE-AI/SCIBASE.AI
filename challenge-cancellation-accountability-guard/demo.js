import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { evaluateChallengeCancellations } from "./index.js"
import { cancellationPolicy, challengeCancellations } from "./sample-data.js"

const report = evaluateChallengeCancellations(challengeCancellations, cancellationPolicy)
const reportsDir = new URL("./reports/", import.meta.url)
mkdirSync(reportsDir, { recursive: true })

const money = (cents) => `$${(cents / 100).toLocaleString("en-US")}`

const markdown = `# Challenge Cancellation Accountability Guard

Status: ${report.status}

## Totals
- Challenges reviewed: ${report.totals.challenges}
- Held challenges: ${report.totals.heldChallenges}
- Ready challenges: ${report.totals.readyChallenges}
- Solver teams affected: ${report.totals.solverTeams}
- Funded escrow reviewed: ${money(report.totals.totalFundedCents)}
- Compensation shortfall: ${money(report.totals.compensationShortfallCents)}
- Critical findings: ${report.totals.criticalCount}
- Warning findings: ${report.totals.warningCount}
- Audit digest: ${report.auditDigest}

## Challenge Decisions
${report.challengeSummaries
  .map(
    (summary) =>
      `- ${summary.id}: ${summary.decision}; notified ${summary.notifiedCount}/${summary.solverCount}; reviewed ${summary.reviewedCount}/${summary.solverCount}; IP safe ${summary.ipSafeCount}/${summary.solverCount}; shortfall ${money(summary.compensationShortfallCents)}`,
  )
  .join("\n")}

## Findings
${report.findings
  .map(
    (finding) =>
      `- ${finding.severity}: ${finding.code} (${finding.challengeId}) - ${finding.message}`,
  )
  .join("\n")}
`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#172033"/>
  <rect x="58" y="54" width="1164" height="612" rx="20" fill="#f8fafc"/>
  <text x="96" y="126" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#101827">Challenge Cancellation Accountability Guard</text>
  <text x="96" y="174" font-family="Arial, sans-serif" font-size="23" fill="#334155">Status: ${report.status}</text>
  <g font-family="Arial, sans-serif" font-size="24" fill="#101827">
    <text x="96" y="254">Challenges reviewed: ${report.totals.challenges}</text>
    <text x="96" y="300">Held challenges: ${report.totals.heldChallenges}</text>
    <text x="96" y="346">Ready challenges: ${report.totals.readyChallenges}</text>
    <text x="96" y="392">Solver teams affected: ${report.totals.solverTeams}</text>
    <text x="96" y="438">Compensation shortfall: ${money(report.totals.compensationShortfallCents)}</text>
    <text x="96" y="484">Critical findings: ${report.totals.criticalCount}</text>
  </g>
  <rect x="690" y="236" width="438" height="248" rx="14" fill="#ecfeff" stroke="#0891b2" stroke-width="3"/>
  <text x="724" y="290" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#155e75">Controls covered</text>
  <text x="724" y="340" font-family="Arial, sans-serif" font-size="21" fill="#155e75">Cancellation reason evidence</text>
  <text x="724" y="381" font-family="Arial, sans-serif" font-size="21" fill="#155e75">Solver notice and appeal window</text>
  <text x="724" y="422" font-family="Arial, sans-serif" font-size="21" fill="#155e75">Escrow refund and compensation hold</text>
  <text x="724" y="463" font-family="Arial, sans-serif" font-size="21" fill="#155e75">Solver IP retention before settlement</text>
  <text x="96" y="594" font-family="Arial, sans-serif" font-size="18" fill="#475569">Audit digest: ${report.auditDigest.slice(0, 48)}...</text>
</svg>
`

writeFileSync(join(reportsDir.pathname, "summary.json"), `${JSON.stringify(report, null, 2)}\n`)
writeFileSync(join(reportsDir.pathname, "cancellation-review-packet.md"), markdown)
writeFileSync(join(reportsDir.pathname, "summary.svg"), svg)

console.log(`Status: ${report.status}`)
console.log(`Challenges reviewed: ${report.totals.challenges}`)
console.log(`Held challenges: ${report.totals.heldChallenges}`)
console.log(`Ready challenges: ${report.totals.readyChallenges}`)
console.log(`Solver teams affected: ${report.totals.solverTeams}`)
console.log(`Compensation shortfall: ${money(report.totals.compensationShortfallCents)}`)
console.log(`Critical findings: ${report.totals.criticalCount}`)
console.log(`Audit digest: ${report.auditDigest}`)
