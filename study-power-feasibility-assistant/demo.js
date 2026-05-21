const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { evaluateStudyPortfolio } = require("./index")
const { reviewPolicy, studyClaims } = require("./sample-data")

const reportsDir = path.join(__dirname, "reports")
fs.mkdirSync(reportsDir, { recursive: true })

const packet = evaluateStudyPortfolio({ studyClaims, reviewPolicy })
const { summary } = packet

fs.writeFileSync(
  path.join(reportsDir, "study-power-review-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`,
)

const markdown = [
  "# Study Power Feasibility Assistant Report",
  "",
  `Generated claims: ${summary.totalClaims}`,
  `Passed: ${summary.passed}`,
  `Needs revision: ${summary.revise}`,
  `Held: ${summary.held}`,
  `Reviewer actions: ${summary.reviewerActions}`,
  `Audit digest: \`${packet.audit.digest}\``,
  "",
  "## Claim Decisions",
  ...packet.decisions.flatMap((decision) => [
    "",
    `### ${decision.id}: ${decision.title}`,
    `- Status: ${decision.status}`,
    `- Domain: ${decision.domain}`,
    `- Required n/group: ${decision.powerAssessment.requiredPerGroup}`,
    `- Actual n/group: ${decision.powerAssessment.sampleSizePerGroup}`,
    `- Coverage ratio: ${decision.powerAssessment.coverageRatio}`,
    `- Findings: ${decision.findings.map((finding) => finding.code).join(", ") || "none"}`,
    `- First action: ${decision.reviewerActions[0]?.message || "none"}`,
  ]),
  "",
]

fs.writeFileSync(path.join(reportsDir, "study-power-review-report.md"), markdown.join("\n"))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#111827"/>
  <text x="48" y="78" fill="#f9fafb" font-family="Arial" font-size="34" font-weight="700">Study Power Feasibility Assistant</text>
  <text x="48" y="124" fill="#cbd5e1" font-family="Arial" font-size="18">Synthetic statistical review packet for SCIBASE issue #16</text>
  <rect x="48" y="170" width="250" height="150" rx="14" fill="#0f766e"/>
  <text x="78" y="230" fill="#ecfeff" font-family="Arial" font-size="56" font-weight="700">${summary.passed}</text>
  <text x="78" y="270" fill="#ccfbf1" font-family="Arial" font-size="22">passed</text>
  <rect x="355" y="170" width="250" height="150" rx="14" fill="#b45309"/>
  <text x="385" y="230" fill="#fff7ed" font-family="Arial" font-size="56" font-weight="700">${summary.revise}</text>
  <text x="385" y="270" fill="#ffedd5" font-family="Arial" font-size="22">revise</text>
  <rect x="662" y="170" width="250" height="150" rx="14" fill="#991b1b"/>
  <text x="692" y="230" fill="#fef2f2" font-family="Arial" font-size="56" font-weight="700">${summary.held}</text>
  <text x="692" y="270" fill="#fee2e2" font-family="Arial" font-size="22">held</text>
  <text x="48" y="390" fill="#e5e7eb" font-family="Arial" font-size="20">Checks: n per group, effect size, variance, alpha, target power, multiple testing, preregistration evidence.</text>
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
  "drawbox=x=48:y=170:w=250:h=150:color=0x0f766e@1:t=fill,drawbox=x=355:y=170:w=250:h=150:color=0xb45309@1:t=fill,drawbox=x=662:y=170:w=250:h=150:color=0x991b1b@1:t=fill,drawbox=x=48:y=370:w=864:h=18:color=0x22d3ee@1:t=fill",
  "-pix_fmt",
  "yuv420p",
  path.join(reportsDir, "demo.mp4"),
], { stdio: "ignore" })

if (ffmpeg.status !== 0) {
  console.warn("ffmpeg video generation failed; summary.svg and JSON/Markdown reports were still generated.")
}

console.log(`Wrote study power artifacts to ${reportsDir}`)
