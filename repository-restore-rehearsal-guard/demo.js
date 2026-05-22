const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { evaluateRestoreRehearsal } = require("./index")
const { repositories, policy } = require("./sample-data")

const reportsDir = path.join(__dirname, "reports")
fs.mkdirSync(reportsDir, { recursive: true })

const packet = evaluateRestoreRehearsal({
  asOf: "2026-05-23T02:00:00.000Z",
  repositories,
  policy,
})

fs.writeFileSync(
  path.join(reportsDir, "restore-rehearsal-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`,
)

const markdown = [
  "# Repository Restore Rehearsal Report",
  "",
  `Repositories reviewed: ${packet.summary.totalRepositories}`,
  `Restore-ready repositories: ${packet.summary.readyRepositories}`,
  `Held repositories: ${packet.summary.heldRepositories}`,
  `Critical findings: ${packet.summary.criticalFindings}`,
  `Warning findings: ${packet.summary.warningFindings}`,
  `Audit digest: \`${packet.audit.digest}\``,
  "",
  "## Repository Decisions",
  ...packet.repositories.flatMap((repository) => [
    "",
    `### ${repository.title}`,
    `- Status: ${repository.status}`,
    `- Snapshot: ${repository.snapshotId}`,
    `- Candidate tag: ${repository.releaseCandidate.tag || "none"}`,
    `- Checks passed: ${repository.summary.passedChecks}/${repository.summary.checks}`,
    `- Finding codes: ${repository.findings.map((finding) => finding.code).join(", ") || "none"}`,
  ]),
  "",
  "## Remediation Queue",
  ...packet.remediationQueue.map((item) => (
    `- ${item.repositoryId}/${item.snapshotId}: ${item.action} (${item.severity})`
  )),
  "",
]

fs.writeFileSync(path.join(reportsDir, "restore-rehearsal-report.md"), markdown.join("\n"))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#102018"/>
  <text x="48" y="78" fill="#f8fafc" font-family="Arial" font-size="34" font-weight="700">Repository Restore Rehearsal Guard</text>
  <text x="48" y="122" fill="#cbd5e1" font-family="Arial" font-size="18">Release snapshots are checked before DOI/export publication</text>
  <rect x="48" y="172" width="250" height="150" rx="10" fill="#047857"/>
  <text x="78" y="232" fill="#ecfdf5" font-family="Arial" font-size="56" font-weight="700">${packet.summary.readyRepositories}</text>
  <text x="78" y="272" fill="#a7f3d0" font-family="Arial" font-size="22">restore ready</text>
  <rect x="355" y="172" width="250" height="150" rx="10" fill="#b45309"/>
  <text x="385" y="232" fill="#fffbeb" font-family="Arial" font-size="56" font-weight="700">${packet.summary.warningFindings}</text>
  <text x="385" y="272" fill="#fde68a" font-family="Arial" font-size="22">warnings</text>
  <rect x="662" y="172" width="250" height="150" rx="10" fill="#be123c"/>
  <text x="692" y="232" fill="#ffe4e6" font-family="Arial" font-size="56" font-weight="700">${packet.summary.criticalFindings}</text>
  <text x="692" y="272" fill="#fecdd3" font-family="Arial" font-size="22">critical</text>
  <text x="48" y="386" fill="#e2e8f0" font-family="Arial" font-size="20">Controls: restore drill, refs, tags, checksums, LFS mirrors, environment locks, notebook replay, export manifest.</text>
  <text x="48" y="426" fill="#94a3b8" font-family="Arial" font-size="16">Digest ${packet.audit.digest.slice(0, 28)}...</text>
</svg>
`

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg)

const ffmpeg = spawnSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0x102018:s=960x540:d=5:r=15",
  "-vf",
  "drawbox=x=48:y=172:w=250:h=150:color=0x047857@1:t=fill,drawbox=x=355:y=172:w=250:h=150:color=0xb45309@1:t=fill,drawbox=x=662:y=172:w=250:h=150:color=0xbe123c@1:t=fill,drawbox=x=48:y=368:w=864:h=18:color=0x22c55e@1:t=fill",
  "-pix_fmt",
  "yuv420p",
  path.join(reportsDir, "demo.mp4"),
], { stdio: "ignore" })

if (ffmpeg.status !== 0) {
  console.warn("ffmpeg video generation failed; JSON, Markdown, and SVG reports were still generated.")
}

console.log(`Wrote repository restore rehearsal artifacts to ${reportsDir}`)
