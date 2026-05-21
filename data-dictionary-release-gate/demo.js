const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { evaluateReleasePortfolio } = require("./index")
const { datasets, releasePolicy } = require("./sample-data")

const reportsDir = path.join(__dirname, "reports")
fs.mkdirSync(reportsDir, { recursive: true })

const packet = evaluateReleasePortfolio({ datasets, policy: releasePolicy })
const { summary } = packet

fs.writeFileSync(
  path.join(reportsDir, "data-dictionary-release-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`,
)

const markdown = [
  "# Data Dictionary Release Gate Report",
  "",
  `Generated datasets: ${summary.totalDatasets}`,
  `Passed: ${summary.passed}`,
  `Needs revision: ${summary.revise}`,
  `Held: ${summary.held}`,
  `Blockers: ${summary.blockers}`,
  `Warnings: ${summary.warnings}`,
  `Audit digest: \`${packet.audit.digest}\``,
  "",
  "## Dataset Decisions",
  ...packet.decisions.flatMap((decision) => [
    "",
    `### ${decision.id}: ${decision.title}`,
    `- Status: ${decision.status}`,
    `- Release target: ${decision.releaseTarget}`,
    `- Files: ${decision.manifest.files}`,
    `- Columns: ${decision.manifest.columns}`,
    `- Dictionary entries: ${decision.manifest.dictionaryEntries}`,
    `- License: ${decision.manifest.license}`,
    `- Findings: ${decision.findings.map((finding) => finding.code).join(", ") || "none"}`,
    `- First action: ${decision.reviewerActions[0]?.message || "none"}`,
  ]),
  "",
]

fs.writeFileSync(path.join(reportsDir, "data-dictionary-release-report.md"), markdown.join("\n"))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#0f172a"/>
  <text x="48" y="78" fill="#f8fafc" font-family="Arial" font-size="34" font-weight="700">Data Dictionary Release Gate</text>
  <text x="48" y="124" fill="#cbd5e1" font-family="Arial" font-size="18">Synthetic FAIR metadata and unit-readiness packet for SCIBASE issue #14</text>
  <rect x="48" y="170" width="250" height="150" rx="14" fill="#047857"/>
  <text x="78" y="230" fill="#ecfdf5" font-family="Arial" font-size="56" font-weight="700">${summary.passed}</text>
  <text x="78" y="270" fill="#d1fae5" font-family="Arial" font-size="22">passed</text>
  <rect x="355" y="170" width="250" height="150" rx="14" fill="#a16207"/>
  <text x="385" y="230" fill="#fefce8" font-family="Arial" font-size="56" font-weight="700">${summary.revise}</text>
  <text x="385" y="270" fill="#fef3c7" font-family="Arial" font-size="22">revise</text>
  <rect x="662" y="170" width="250" height="150" rx="14" fill="#b91c1c"/>
  <text x="692" y="230" fill="#fef2f2" font-family="Arial" font-size="56" font-weight="700">${summary.held}</text>
  <text x="692" y="270" fill="#fee2e2" font-family="Arial" font-size="22">held</text>
  <text x="48" y="390" fill="#e2e8f0" font-family="Arial" font-size="20">Checks: column coverage, units, missingness, semantic tags, checksums, license, DataCite, schema.org.</text>
  <text x="48" y="430" fill="#94a3b8" font-family="Arial" font-size="16">Digest ${packet.audit.digest.slice(0, 24)}...</text>
</svg>
`
fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg)

const ffmpeg = spawnSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0x0f172a:s=960x540:d=6:r=15",
  "-vf",
  "drawbox=x=48:y=170:w=250:h=150:color=0x047857@1:t=fill,drawbox=x=355:y=170:w=250:h=150:color=0xa16207@1:t=fill,drawbox=x=662:y=170:w=250:h=150:color=0xb91c1c@1:t=fill,drawbox=x=48:y=370:w=864:h=18:color=0x38bdf8@1:t=fill",
  "-pix_fmt",
  "yuv420p",
  path.join(reportsDir, "demo.mp4"),
], { stdio: "ignore" })

if (ffmpeg.status !== 0) {
  console.warn("ffmpeg video generation failed; summary.svg and JSON/Markdown reports were still generated.")
}

console.log(`Wrote data dictionary release artifacts to ${reportsDir}`)
