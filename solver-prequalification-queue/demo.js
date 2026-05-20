const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const { generateSolverPrequalificationQueue } = require("./index")
const { policy, challenges, teams } = require("./sample-data")

const outDir = __dirname
const packet = generateSolverPrequalificationQueue(challenges, teams, policy)

function writeJson() {
  fs.writeFileSync(path.join(outDir, "prequalification-report.json"), `${JSON.stringify(packet, null, 2)}\n`)
}

function writeMarkdown() {
  const lines = [
    "# Solver Prequalification Queue Review Packet",
    "",
    `Generated: ${packet.generatedAt}`,
    `Audit digest: ${packet.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Approved candidates: ${packet.summary.approved}`,
    `- Needs review: ${packet.summary["needs-review"]}`,
    `- Blocked candidates: ${packet.summary.blocked}`,
    `- Private workspace grants: ${packet.summary.workspaceGrants}`,
    "",
    "## Challenge Queues",
    "",
  ]

  for (const queue of packet.challengeQueues) {
    lines.push(`### ${queue.challengeId} - ${queue.title}`)
    lines.push("")
    for (const candidate of queue.candidates) {
      lines.push(
        `- ${candidate.displayName}: ${candidate.decision} (${candidate.workspaceAccess}), expertise ${candidate.expertiseScore}, findings ${candidate.findingCodes.join(", ") || "none"}`,
      )
    }
    lines.push("")
  }

  fs.writeFileSync(path.join(outDir, "coordinator-review-packet.md"), `${lines.join("\n")}\n`)
}

function writeSvg() {
  const colors = { approved: "#2f9e44", "needs-review": "#f08c00", blocked: "#c92a2a" }
  const rows = packet.evaluations
    .map((evaluation, index) => {
      const y = 150 + index * 52
      const findingText = evaluation.findings.map((finding) => finding.code).join(", ") || "clear"
      return `
  <g transform="translate(52 ${y})">
    <rect width="24" height="24" rx="5" fill="${colors[evaluation.decision]}" />
    <text x="42" y="18" font-size="18" font-family="Arial" fill="#111827">${evaluation.displayName} - ${evaluation.decision}</text>
    <text x="540" y="18" font-size="15" font-family="Arial" fill="#4b5563">${findingText}</text>
  </g>`
    })
    .join("")

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="430" viewBox="0 0 960 430">
  <rect width="960" height="430" fill="#f8fafc"/>
  <text x="52" y="62" font-size="34" font-family="Arial" font-weight="700" fill="#111827">Solver Prequalification Queue</text>
  <text x="52" y="98" font-size="18" font-family="Arial" fill="#4b5563">Approved ${packet.summary.approved} / Review ${packet.summary["needs-review"]} / Blocked ${packet.summary.blocked}</text>
  ${rows}
  <text x="52" y="390" font-size="14" font-family="Arial" fill="#6b7280">Audit digest: ${packet.auditDigest.slice(0, 32)}...</text>
</svg>`

  fs.writeFileSync(path.join(outDir, "demo.svg"), `${svg}\n`)
}

function writeMp4() {
  const mp4Path = path.join(outDir, "demo.mp4")
  const font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
  const title = "Solver Prequalification Queue"
  const summary = `Approved ${packet.summary.approved}  Review ${packet.summary["needs-review"]}  Blocked ${packet.summary.blocked}`
  const grants = `Private workspace grants: ${packet.summary.workspaceGrants}`
  const filter = [
    `drawtext=fontfile=${font}:text='${title}':x=60:y=80:fontsize=34:fontcolor=white`,
    `drawtext=fontfile=${font}:text='${summary}':x=60:y=150:fontsize=28:fontcolor=white`,
    `drawtext=fontfile=${font}:text='${grants}':x=60:y=220:fontsize=24:fontcolor=white`,
    `drawtext=fontfile=${font}:text='NDA, conflict, expertise, and workload checks signed for audit':x=60:y=290:fontsize=22:fontcolor=white`,
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
writeMarkdown()
writeSvg()
writeMp4()

console.log(`Wrote solver prequalification queue artifacts to ${outDir}`)
