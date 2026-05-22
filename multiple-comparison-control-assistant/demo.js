const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { evaluateMultipleComparisonControls } = require("./index")
const { manuscripts, policy } = require("./sample-data")

const reportsDir = path.join(__dirname, "reports")
fs.mkdirSync(reportsDir, { recursive: true })

const packet = evaluateMultipleComparisonControls({
  asOf: "2026-05-23T03:00:00.000Z",
  manuscripts,
  policy,
})

fs.writeFileSync(
  path.join(reportsDir, "multiple-comparison-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`,
)

const markdown = [
  "# Multiple-Comparison Control Assistant Report",
  "",
  `Manuscripts reviewed: ${packet.summary.totalManuscripts}`,
  `Ready manuscripts: ${packet.summary.readyManuscripts}`,
  `Revise before submission: ${packet.summary.reviseManuscripts}`,
  `Analysis families: ${packet.summary.totalFamilies}`,
  `Tests reviewed: ${packet.summary.totalTests}`,
  `Critical findings: ${packet.summary.criticalFindings}`,
  `Warning findings: ${packet.summary.warningFindings}`,
  `Audit digest: \`${packet.audit.digest}\``,
  "",
  "## Manuscript Decisions",
  ...packet.manuscripts.flatMap((manuscript) => [
    "",
    `### ${manuscript.title}`,
    `- Status: ${manuscript.status}`,
    `- Families: ${manuscript.summary.families}`,
    `- Tests: ${manuscript.summary.tests}`,
    `- Finding codes: ${manuscript.findings.map((finding) => finding.code).join(", ") || "none"}`,
  ]),
  "",
  "## Review Queue",
  ...packet.reviewQueue.map((item) => (
    `- ${item.manuscriptId}/${item.familyId}: ${item.action} (${item.severity})`
  )),
  "",
]

fs.writeFileSync(path.join(reportsDir, "multiple-comparison-report.md"), markdown.join("\n"))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#16202a"/>
  <text x="48" y="78" fill="#f8fafc" font-family="Arial" font-size="34" font-weight="700">Multiple-Comparison Control Assistant</text>
  <text x="48" y="122" fill="#cbd5e1" font-family="Arial" font-size="18">AI peer-review aid for FDR, adjusted p-values, and endpoint hierarchy</text>
  <rect x="48" y="172" width="250" height="150" rx="10" fill="#047857"/>
  <text x="78" y="232" fill="#ecfdf5" font-family="Arial" font-size="56" font-weight="700">${packet.summary.readyManuscripts}</text>
  <text x="78" y="272" fill="#a7f3d0" font-family="Arial" font-size="22">ready</text>
  <rect x="355" y="172" width="250" height="150" rx="10" fill="#7c3aed"/>
  <text x="385" y="232" fill="#ede9fe" font-family="Arial" font-size="56" font-weight="700">${packet.summary.totalTests}</text>
  <text x="385" y="272" fill="#ddd6fe" font-family="Arial" font-size="22">tests reviewed</text>
  <rect x="662" y="172" width="250" height="150" rx="10" fill="#be123c"/>
  <text x="692" y="232" fill="#ffe4e6" font-family="Arial" font-size="56" font-weight="700">${packet.summary.criticalFindings}</text>
  <text x="692" y="272" fill="#fecdd3" font-family="Arial" font-size="22">critical</text>
  <text x="48" y="386" fill="#e2e8f0" font-family="Arial" font-size="20">Controls: family boundaries, correction methods, adjusted values, FDR threshold, hierarchy, exploratory labels.</text>
  <text x="48" y="426" fill="#94a3b8" font-family="Arial" font-size="16">Digest ${packet.audit.digest.slice(0, 28)}...</text>
</svg>
`

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg)

const ffmpeg = spawnSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0x16202a:s=960x540:d=5:r=15",
  "-vf",
  "drawbox=x=48:y=172:w=250:h=150:color=0x047857@1:t=fill,drawbox=x=355:y=172:w=250:h=150:color=0x7c3aed@1:t=fill,drawbox=x=662:y=172:w=250:h=150:color=0xbe123c@1:t=fill,drawbox=x=48:y=368:w=864:h=18:color=0x38bdf8@1:t=fill",
  "-pix_fmt",
  "yuv420p",
  path.join(reportsDir, "demo.mp4"),
], { stdio: "ignore" })

if (ffmpeg.status !== 0) {
  console.warn("ffmpeg video generation failed; JSON, Markdown, and SVG reports were still generated.")
}

console.log(`Wrote multiple-comparison assistant artifacts to ${reportsDir}`)
