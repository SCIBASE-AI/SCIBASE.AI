const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const { generateGovernancePacket } = require("./index")
const { policy, projects } = require("./sample-data")

const outDir = __dirname
const packet = generateGovernancePacket(projects, policy)

function writeJson() {
  fs.writeFileSync(
    path.join(outDir, "irb-consent-report.json"),
    `${JSON.stringify(packet, null, 2)}\n`,
  )
}

function writeReviewerPacket() {
  const lines = [
    "# Enterprise IRB Consent Governance Review Packet",
    "",
    `Generated: ${packet.generatedAt}`,
    `Audit digest: ${packet.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Projects evaluated: ${packet.summary.projectCount}`,
    `- Approved: ${packet.summary.approved}`,
    `- Review: ${packet.summary.review}`,
    `- Blocked: ${packet.summary.blocked}`,
    "",
    "## Top risks",
    "",
    ...packet.summary.topRisks.map(
      (risk) => `- ${risk.projectId}: ${risk.title} - ${risk.status} (${risk.riskScore})`,
    ),
    "",
    "## Action queue",
    "",
    ...packet.evaluations.flatMap((evaluation) =>
      evaluation.actionQueue.map(
        (action) =>
          `- ${evaluation.projectId}: ${action.code} assigned to ${action.owner}, due in ${action.dueInDays} day(s)`,
      ),
    ),
    "",
  ]

  fs.writeFileSync(path.join(outDir, "reviewer-packet.md"), `${lines.join("\n")}\n`)
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function writeSvg() {
  const rows = packet.evaluations
    .map((evaluation, index) => {
      const y = 150 + index * 54
      const color = evaluation.status === "approved" ? "#2f9e44" : evaluation.status === "review" ? "#f08c00" : "#c92a2a"
      return `
  <g transform="translate(48 ${y})">
    <circle cx="12" cy="12" r="9" fill="${color}" />
    <text x="34" y="17" font-size="18" font-family="Arial" fill="#17202a">${escapeXml(evaluation.projectId)} - ${escapeXml(evaluation.status)}</text>
    <text x="520" y="17" font-size="16" font-family="Arial" fill="#4b5563">risk ${evaluation.riskScore}</text>
  </g>`
    })
    .join("")

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="430" viewBox="0 0 900 430">
  <rect width="900" height="430" fill="#f8fafc" />
  <text x="48" y="62" font-size="34" font-family="Arial" font-weight="700" fill="#111827">Enterprise IRB Consent Governance</text>
  <text x="48" y="98" font-size="18" font-family="Arial" fill="#4b5563">Approved ${packet.summary.approved} / Review ${packet.summary.review} / Blocked ${packet.summary.blocked}</text>
  ${rows}
  <text x="48" y="390" font-size="14" font-family="Arial" fill="#6b7280">Audit digest: ${packet.auditDigest.slice(0, 32)}...</text>
</svg>`

  fs.writeFileSync(path.join(outDir, "demo.svg"), `${svg}\n`)
}

function writeMp4() {
  const mp4Path = path.join(outDir, "demo.mp4")
  const title = "Enterprise IRB Consent Governance"
  const summary = `Approved ${packet.summary.approved}  Review ${packet.summary.review}  Blocked ${packet.summary.blocked}`
  const topRisk = packet.summary.topRisks[0]
  const riskText = `Top risk: ${topRisk.projectId} score ${topRisk.riskScore}`
  const font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

  const filter = [
    `drawtext=fontfile=${font}:text='${title}':x=60:y=80:fontsize=34:fontcolor=white`,
    `drawtext=fontfile=${font}:text='${summary}':x=60:y=150:fontsize=28:fontcolor=white`,
    `drawtext=fontfile=${font}:text='${riskText}':x=60:y=220:fontsize=24:fontcolor=white`,
    `drawtext=fontfile=${font}:text='Signed webhook events and reviewer packet generated':x=60:y=290:fontsize=22:fontcolor=white`,
  ].join(",")

  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x111827:s=1280x720:d=7:r=24",
      "-vf",
      filter,
      "-pix_fmt",
      "yuv420p",
      mp4Path,
    ],
    { stdio: "pipe" },
  )

  if (result.status !== 0) {
    fs.writeFileSync(path.join(outDir, "demo-video-warning.txt"), result.stderr.toString())
  }
}

writeJson()
writeReviewerPacket()
writeSvg()
writeMp4()

console.log(`Wrote enterprise IRB consent governance artifacts to ${outDir}`)
