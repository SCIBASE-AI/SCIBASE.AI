const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { evaluateBadgePortfolio } = require("./index")
const { badgePolicy, projects } = require("./sample-data")

const reportsDir = path.join(__dirname, "reports")
fs.mkdirSync(reportsDir, { recursive: true })

const packet = evaluateBadgePortfolio({ projects, policy: badgePolicy })
const { summary } = packet

fs.writeFileSync(
  path.join(reportsDir, "reproducibility-badge-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`,
)

const markdown = [
  "# Reproducibility Badge Verification Report",
  "",
  `Generated projects: ${summary.totalProjects}`,
  `Passed: ${summary.passed}`,
  `Needs revision: ${summary.revise}`,
  `Held: ${summary.held}`,
  `Valid independent runs: ${summary.validIndependentRuns}`,
  `Audit digest: \`${packet.audit.digest}\``,
  "",
  "## Badge Decisions",
  ...packet.decisions.flatMap((decision) => [
    "",
    `### ${decision.id}: ${decision.title}`,
    `- Status: ${decision.status}`,
    `- Requested badge: ${decision.requestedBadge}`,
    `- Recommended badge: ${decision.recommendedBadge}`,
    `- Required artifacts: ${decision.evidence.requiredArtifacts}`,
    `- Reproduction runs: ${decision.evidence.reproductionRuns}`,
    `- Valid independent runs: ${decision.evidence.validIndependentRuns}`,
    `- Unique valid institutions: ${decision.evidence.uniqueValidInstitutions}`,
    `- Findings: ${decision.findings.map((finding) => finding.code).join(", ") || "none"}`,
    `- First action: ${decision.reviewerActions[0]?.message || "none"}`,
  ]),
  "",
]

fs.writeFileSync(path.join(reportsDir, "reproducibility-badge-report.md"), markdown.join("\n"))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#111827"/>
  <text x="48" y="78" fill="#f9fafb" font-family="Arial" font-size="34" font-weight="700">Reproducibility Badge Verification</text>
  <text x="48" y="124" fill="#cbd5e1" font-family="Arial" font-size="18">Independent evidence packet for SCIBASE community reputation issue #15</text>
  <rect x="48" y="170" width="250" height="150" rx="14" fill="#15803d"/>
  <text x="78" y="230" fill="#f0fdf4" font-family="Arial" font-size="56" font-weight="700">${summary.passed}</text>
  <text x="78" y="270" fill="#dcfce7" font-family="Arial" font-size="22">issue badge</text>
  <rect x="355" y="170" width="250" height="150" rx="14" fill="#b45309"/>
  <text x="385" y="230" fill="#fffbeb" font-family="Arial" font-size="56" font-weight="700">${summary.revise}</text>
  <text x="385" y="270" fill="#fef3c7" font-family="Arial" font-size="22">revise evidence</text>
  <rect x="662" y="170" width="250" height="150" rx="14" fill="#be123c"/>
  <text x="692" y="230" fill="#fff1f2" font-family="Arial" font-size="56" font-weight="700">${summary.held}</text>
  <text x="692" y="270" fill="#ffe4e6" font-family="Arial" font-size="22">hold badge</text>
  <text x="48" y="390" fill="#e5e7eb" font-family="Arial" font-size="20">Checks: independent runs, artifact hashes, environment digest, output match, test pass, disclosures, conflicts.</text>
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
  "drawbox=x=48:y=170:w=250:h=150:color=0x15803d@1:t=fill,drawbox=x=355:y=170:w=250:h=150:color=0xb45309@1:t=fill,drawbox=x=662:y=170:w=250:h=150:color=0xbe123c@1:t=fill,drawbox=x=48:y=370:w=864:h=18:color=0x22c55e@1:t=fill",
  "-pix_fmt",
  "yuv420p",
  path.join(reportsDir, "demo.mp4"),
], { stdio: "ignore" })

if (ffmpeg.status !== 0) {
  console.warn("ffmpeg video generation failed; summary.svg and JSON/Markdown reports were still generated.")
}

console.log(`Wrote reproducibility badge artifacts to ${reportsDir}`)
