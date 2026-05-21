const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { evaluateTransferPortfolio } = require("./index")
const { policy, transferRequests } = require("./sample-data")

const reportsDir = path.join(__dirname, "reports")
fs.mkdirSync(reportsDir, { recursive: true })

const packet = evaluateTransferPortfolio({ transferRequests, policy })
const { summary } = packet

fs.writeFileSync(
  path.join(reportsDir, "transfer-revenue-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`,
)

const markdown = [
  "# Institutional Account Transfer Revenue Guard Report",
  "",
  `Generated transfers: ${summary.totalTransfers}`,
  `Approved: ${summary.approved}`,
  `Conditional: ${summary.conditional}`,
  `Held: ${summary.held}`,
  `Net transfer invoice cents: ${summary.netTransferInvoiceCents}`,
  `Held compute credits: ${summary.heldComputeCredits}`,
  `Audit digest: \`${packet.audit.digest}\``,
  "",
  "## Transfer Decisions",
  ...packet.decisions.flatMap((decision) => [
    "",
    `### ${decision.id}: ${decision.title}`,
    `- Status: ${decision.status}`,
    `- Source: ${decision.sourceOrg}`,
    `- Target: ${decision.targetOrg}`,
    `- Risk score: ${decision.riskScore}`,
    `- Blockers: ${decision.blockers.map((finding) => finding.code).join(", ") || "none"}`,
    `- Warnings: ${decision.warnings.map((finding) => finding.code).join(", ") || "none"}`,
    `- Adjustments: ${decision.adjustments.map((finding) => finding.code).join(", ") || "none"}`,
    `- Finance actions: ${decision.financeActions.map((financeAction) => financeAction.code).join(", ") || "none"}`,
  ]),
  "",
]

fs.writeFileSync(path.join(reportsDir, "transfer-revenue-report.md"), markdown.join("\n"))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#111827"/>
  <text x="48" y="78" fill="#f9fafb" font-family="Arial" font-size="34" font-weight="700">Institutional Account Transfer Revenue Guard</text>
  <text x="48" y="124" fill="#cbd5e1" font-family="Arial" font-size="18">Synthetic finance review packet for SCIBASE issue #20</text>
  <rect x="48" y="170" width="250" height="150" rx="14" fill="#0f766e"/>
  <text x="78" y="230" fill="#ecfeff" font-family="Arial" font-size="56" font-weight="700">${summary.approved}</text>
  <text x="78" y="270" fill="#ccfbf1" font-family="Arial" font-size="22">approved</text>
  <rect x="355" y="170" width="250" height="150" rx="14" fill="#b45309"/>
  <text x="385" y="230" fill="#fff7ed" font-family="Arial" font-size="56" font-weight="700">${summary.conditional}</text>
  <text x="385" y="270" fill="#ffedd5" font-family="Arial" font-size="22">conditional</text>
  <rect x="662" y="170" width="250" height="150" rx="14" fill="#991b1b"/>
  <text x="692" y="230" fill="#fef2f2" font-family="Arial" font-size="56" font-weight="700">${summary.held}</text>
  <text x="692" y="270" fill="#fee2e2" font-family="Arial" font-size="22">held</text>
  <text x="48" y="390" fill="#e5e7eb" font-family="Arial" font-size="20">Checks: invoices, PO authority, SSO domain, consortium discounts, analytics license, compute-credit ownership.</text>
  <text x="48" y="430" fill="#9ca3af" font-family="Arial" font-size="16">Digest ${packet.audit.digest.slice(0, 24)}...</text>
</svg>
`
fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg)

const ffmpeg = spawnSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0x111827:s=960x540:d=6:r=15",
  "-vf",
  "drawbox=x=48:y=170:w=250:h=150:color=0x0f766e@1:t=fill,drawbox=x=355:y=170:w=250:h=150:color=0xb45309@1:t=fill,drawbox=x=662:y=170:w=250:h=150:color=0x991b1b@1:t=fill,drawbox=x=48:y=370:w=864:h=18:color=0x38bdf8@1:t=fill",
  "-pix_fmt",
  "yuv420p",
  path.join(reportsDir, "demo.mp4"),
], { stdio: "ignore" })

if (ffmpeg.status !== 0) {
  console.warn("ffmpeg video generation failed; summary.svg and JSON/Markdown reports were still generated.")
}

console.log(`Wrote transfer revenue artifacts to ${reportsDir}`)
