const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { evaluateColumnSensitivityRelease } = require("./index")
const { datasets, policy } = require("./sample-data")

const reportsDir = path.join(__dirname, "reports")
fs.mkdirSync(reportsDir, { recursive: true })

const packet = evaluateColumnSensitivityRelease({
  asOf: "2026-05-23T22:25:00.000Z",
  datasets,
  policy,
})

const malformedEvidencePacket = evaluateColumnSensitivityRelease({
  asOf: "2026-05-23T22:25:00.000Z",
  datasets: [{
    datasetId: "malformed-column-release",
    title: "Malformed Column Release",
    releaseModes: ["public_preview", "export_bundle"],
    columns: [null],
  }],
  policy,
})

fs.writeFileSync(
  path.join(reportsDir, "column-sensitivity-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`,
)

fs.writeFileSync(
  path.join(reportsDir, "malformed-evidence-packet.json"),
  `${JSON.stringify(malformedEvidencePacket, null, 2)}\n`,
)

const markdown = [
  "# Column Sensitivity Release Gate Report",
  "",
  `Datasets reviewed: ${packet.summary.totalDatasets}`,
  `Ready datasets: ${packet.summary.readyDatasets}`,
  `Review datasets: ${packet.summary.reviewDatasets}`,
  `Blocked datasets: ${packet.summary.blockedDatasets}`,
  `Columns reviewed: ${packet.summary.totalColumns}`,
  `Sensitive columns: ${packet.summary.sensitiveColumns}`,
  `Critical findings: ${packet.summary.criticalFindings}`,
  `Warning findings: ${packet.summary.warningFindings}`,
  `Audit digest: \`${packet.audit.digest}\``,
  "",
  "## Dataset Decisions",
  ...packet.datasets.flatMap((dataset) => [
    "",
    `### ${dataset.title}`,
    `- Status: ${dataset.status}`,
    `- Columns: ${dataset.summary.columns}`,
    `- Sensitive columns: ${dataset.summary.sensitiveColumns}`,
    `- Finding codes: ${dataset.findings.map((finding) => finding.code).join(", ") || "none"}`,
  ]),
  "",
  "## Hold Queue",
  ...packet.holdQueue.map((item) => (
    `- ${item.datasetId}: ${item.action} (${item.findingCodes.join(", ")})`
  )),
  "",
  "## Malformed Evidence Guard",
  `- Status: ${malformedEvidencePacket.datasets[0].status}`,
  `- Finding codes: ${malformedEvidencePacket.datasets[0].findings.map((finding) => finding.code).join(", ")}`,
  "",
]

fs.writeFileSync(path.join(reportsDir, "column-sensitivity-report.md"), markdown.join("\n"))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#10201d"/>
  <text x="48" y="78" fill="#f8fafc" font-family="Arial" font-size="34" font-weight="700">Column Sensitivity Release Gate</text>
  <text x="48" y="122" fill="#cbd5e1" font-family="Arial" font-size="18">Direct identifiers, quasi-identifiers, free text, location precision, and steward approvals</text>
  <rect x="48" y="172" width="250" height="150" rx="8" fill="#047857"/>
  <text x="78" y="232" fill="#ecfdf5" font-family="Arial" font-size="56" font-weight="700">${packet.summary.readyDatasets}</text>
  <text x="78" y="272" fill="#a7f3d0" font-family="Arial" font-size="22">ready</text>
  <rect x="355" y="172" width="250" height="150" rx="8" fill="#ca8a04"/>
  <text x="385" y="232" fill="#fefce8" font-family="Arial" font-size="56" font-weight="700">${packet.summary.reviewDatasets}</text>
  <text x="385" y="272" fill="#fef08a" font-family="Arial" font-size="22">review</text>
  <rect x="662" y="172" width="250" height="150" rx="8" fill="#be123c"/>
  <text x="692" y="232" fill="#ffe4e6" font-family="Arial" font-size="56" font-weight="700">${packet.summary.blockedDatasets}</text>
  <text x="692" y="272" fill="#fecdd3" font-family="Arial" font-size="22">blocked</text>
  <text x="48" y="386" fill="#e2e8f0" font-family="Arial" font-size="20">Controls run before dataset preview, API access, or export lanes are enabled.</text>
  <text x="48" y="426" fill="#94a3b8" font-family="Arial" font-size="16">Digest ${packet.audit.digest.slice(0, 28)}...</text>
</svg>
`

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg)

const ffmpeg = spawnSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0x10201d:s=960x540:d=5:r=15",
  "-vf",
  "drawbox=x=48:y=172:w=250:h=150:color=0x047857@1:t=fill,drawbox=x=355:y=172:w=250:h=150:color=0xca8a04@1:t=fill,drawbox=x=662:y=172:w=250:h=150:color=0xbe123c@1:t=fill,drawbox=x=48:y=368:w=864:h=18:color=0x38bdf8@1:t=fill",
  "-pix_fmt",
  "yuv420p",
  path.join(reportsDir, "demo.mp4"),
], { stdio: "ignore" })

if (ffmpeg.status !== 0) {
  console.warn("ffmpeg video generation failed; JSON, Markdown, and SVG reports were still generated.")
}

console.log(`Wrote column sensitivity release artifacts to ${reportsDir}`)
