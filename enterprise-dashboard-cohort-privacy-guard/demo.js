const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { evaluateDashboardPrivacy } = require("./index")
const { dashboards, organization, privacyPolicy } = require("./sample-data")

const reportsDir = path.join(__dirname, "reports")
fs.mkdirSync(reportsDir, { recursive: true })

const packet = evaluateDashboardPrivacy({
  asOf: "2026-05-23T00:00:00.000Z",
  organization,
  dashboards,
  policy: privacyPolicy,
})

fs.writeFileSync(
  path.join(reportsDir, "dashboard-privacy-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`,
)

const markdown = [
  "# Enterprise Dashboard Cohort Privacy Report",
  "",
  `Organization: ${packet.organization.name}`,
  `Widgets reviewed: ${packet.summary.totalWidgets}`,
  `Rows reviewed: ${packet.summary.totalRows}`,
  `Hold for privacy review: ${packet.summary.hold_for_privacy_review}`,
  `Masked ready: ${packet.summary.masked_ready}`,
  `Suppressed rows: ${packet.summary.suppressedRows}`,
  `Masked or rolled-up rows: ${packet.summary.maskedRows}`,
  `Blocked raw exports: ${packet.summary.blockedRawExports}`,
  `Audit digest: \`${packet.audit.digest}\``,
  "",
  "## Dashboard Decisions",
  ...packet.dashboards.flatMap((dashboard) => [
    "",
    `### ${dashboard.title}`,
    `- Status: ${dashboard.status}`,
    `- Rows reviewed: ${dashboard.reviewedRows}`,
    `- Suppressed rows: ${dashboard.suppressedRows}`,
    `- Masked rows: ${dashboard.maskedRows}`,
    `- Findings: ${dashboard.findings.map((finding) => finding.code).join(", ") || "none"}`,
    `- Reviewer note: ${dashboard.reviewerNotes[0]}`,
  ]),
  "",
  "## Admin Actions",
  ...packet.adminActions.map((action) => (
    `- ${action.dashboardId}/${action.rowId}: ${action.action} (${action.reasons.join(", ")})`
  )),
  "",
]

fs.writeFileSync(path.join(reportsDir, "dashboard-privacy-report.md"), markdown.join("\n"))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#0f172a"/>
  <text x="48" y="76" fill="#f8fafc" font-family="Arial" font-size="34" font-weight="700">Enterprise Dashboard Cohort Privacy Guard</text>
  <text x="48" y="120" fill="#cbd5e1" font-family="Arial" font-size="18">Small-cohort suppression and export masking for institutional analytics</text>
  <rect x="48" y="168" width="250" height="152" rx="12" fill="#991b1b"/>
  <text x="76" y="230" fill="#fee2e2" font-family="Arial" font-size="56" font-weight="700">${packet.summary.hold_for_privacy_review}</text>
  <text x="76" y="270" fill="#fecaca" font-family="Arial" font-size="22">privacy holds</text>
  <rect x="355" y="168" width="250" height="152" rx="12" fill="#0369a1"/>
  <text x="383" y="230" fill="#e0f2fe" font-family="Arial" font-size="56" font-weight="700">${packet.summary.masked_ready}</text>
  <text x="383" y="270" fill="#bae6fd" font-family="Arial" font-size="22">masked ready</text>
  <rect x="662" y="168" width="250" height="152" rx="12" fill="#166534"/>
  <text x="690" y="230" fill="#dcfce7" font-family="Arial" font-size="56" font-weight="700">${packet.summary.totalRows}</text>
  <text x="690" y="270" fill="#bbf7d0" font-family="Arial" font-size="22">rows reviewed</text>
  <text x="48" y="382" fill="#e2e8f0" font-family="Arial" font-size="20">Controls: k-anonymity, named-contributor suppression, private project masking, rollups, raw export blocks.</text>
  <text x="48" y="424" fill="#94a3b8" font-family="Arial" font-size="16">Digest ${packet.audit.digest.slice(0, 28)}...</text>
</svg>
`

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg)

const ffmpeg = spawnSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0x0f172a:s=960x540:d=5:r=15",
  "-vf",
  "drawbox=x=48:y=168:w=250:h=152:color=0x991b1b@1:t=fill,drawbox=x=355:y=168:w=250:h=152:color=0x0369a1@1:t=fill,drawbox=x=662:y=168:w=250:h=152:color=0x166534@1:t=fill,drawbox=x=48:y=365:w=864:h=18:color=0x14b8a6@1:t=fill",
  "-pix_fmt",
  "yuv420p",
  path.join(reportsDir, "demo.mp4"),
], { stdio: "ignore" })

if (ffmpeg.status !== 0) {
  console.warn("ffmpeg video generation failed; JSON, Markdown, and SVG reports were still generated.")
}

console.log(`Wrote enterprise dashboard privacy artifacts to ${reportsDir}`)
