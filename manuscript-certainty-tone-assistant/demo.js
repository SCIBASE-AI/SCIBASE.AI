const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { evaluatePortfolio } = require("./index")
const { manuscripts, tonePolicy } = require("./sample-data")

const reportsDir = path.join(__dirname, "reports")
fs.mkdirSync(reportsDir, { recursive: true })

const packet = evaluatePortfolio({ manuscripts, policy: tonePolicy })
const { summary } = packet

fs.writeFileSync(
  path.join(reportsDir, "certainty-tone-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`,
)

const markdown = [
  "# Manuscript Certainty Tone Report",
  "",
  `Generated manuscripts: ${summary.totalManuscripts}`,
  `Pass: ${summary.pass}`,
  `Revise: ${summary.revise}`,
  `Hold: ${summary.hold}`,
  `Claims reviewed: ${summary.totalClaims}`,
  `Blockers: ${summary.totalBlockers}`,
  `Warnings: ${summary.totalWarnings}`,
  `Audit digest: \`${packet.audit.digest}\``,
  "",
  "## Manuscript Decisions",
  ...packet.decisions.flatMap((decision) => [
    "",
    `### ${decision.id}: ${decision.title}`,
    `- Status: ${decision.status}`,
    `- Claims: ${decision.summary.claims}`,
    `- Blockers: ${decision.summary.blockers}`,
    `- Warnings: ${decision.summary.warnings}`,
    `- Reviewer actions: ${decision.reviewerActions.map((action) => action.code).join(", ") || "none"}`,
    `- First suggested tone: ${decision.claimDecisions[0]?.suggestedTone || "none"}`,
  ]),
  "",
]

fs.writeFileSync(path.join(reportsDir, "certainty-tone-report.md"), markdown.join("\n"))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#111827"/>
  <text x="48" y="78" fill="#f9fafb" font-family="Arial" font-size="34" font-weight="700">Manuscript Certainty Tone Assistant</text>
  <text x="48" y="124" fill="#cbd5e1" font-family="Arial" font-size="18">AI peer-review guard for evidence-matched scientific wording</text>
  <rect x="48" y="170" width="250" height="150" rx="14" fill="#15803d"/>
  <text x="78" y="230" fill="#f0fdf4" font-family="Arial" font-size="56" font-weight="700">${summary.pass}</text>
  <text x="78" y="270" fill="#dcfce7" font-family="Arial" font-size="22">pass</text>
  <rect x="355" y="170" width="250" height="150" rx="14" fill="#b45309"/>
  <text x="385" y="230" fill="#fffbeb" font-family="Arial" font-size="56" font-weight="700">${summary.revise}</text>
  <text x="385" y="270" fill="#fef3c7" font-family="Arial" font-size="22">revise tone</text>
  <rect x="662" y="170" width="250" height="150" rx="14" fill="#be123c"/>
  <text x="692" y="230" fill="#fff1f2" font-family="Arial" font-size="56" font-weight="700">${summary.hold}</text>
  <text x="692" y="270" fill="#ffe4e6" font-family="Arial" font-size="22">hold claims</text>
  <text x="48" y="390" fill="#e5e7eb" font-family="Arial" font-size="20">Checks: causal language, definitive wording, universal scope, significance claims, uncertainty intervals, limitations.</text>
  <text x="48" y="430" fill="#9ca3af" font-family="Arial" font-size="16">Digest ${packet.audit.digest.slice(0, 24)}...</text>
</svg>
`

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg)

const ffmpeg = spawnSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0x111827:s=960x540:d=5:r=15",
  "-vf",
  "drawbox=x=48:y=170:w=250:h=150:color=0x15803d@1:t=fill,drawbox=x=355:y=170:w=250:h=150:color=0xb45309@1:t=fill,drawbox=x=662:y=170:w=250:h=150:color=0xbe123c@1:t=fill,drawbox=x=48:y=370:w=864:h=18:color=0x38bdf8@1:t=fill",
  "-pix_fmt",
  "yuv420p",
  path.join(reportsDir, "demo.mp4"),
], { stdio: "ignore" })

if (ffmpeg.status !== 0) {
  console.warn("ffmpeg video generation failed; summary.svg and JSON/Markdown reports were still generated.")
}

console.log(`Wrote manuscript certainty tone artifacts to ${reportsDir}`)
