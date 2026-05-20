const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const { generateRevenueGatePacket } = require("./index")
const { policy, invoices } = require("./sample-data")

const outDir = __dirname
const packet = generateRevenueGatePacket(invoices, policy)

function writeJson() {
  fs.writeFileSync(path.join(outDir, "sanctions-export-report.json"), `${JSON.stringify(packet, null, 2)}\n`)
}

function writeMarkdown() {
  const lines = [
    "# Revenue Sanctions Export Gate Review Packet",
    "",
    `Generated: ${packet.generatedAt}`,
    `Audit digest: ${packet.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Released invoices: ${packet.summary.release}`,
    `- Held for review: ${packet.summary["hold-for-review"]}`,
    `- Blocked invoices: ${packet.summary.block}`,
    `- Total revenue reviewed: $${packet.summary.totalRevenue}`,
    `- Held or blocked revenue: $${packet.summary.heldRevenue}`,
    "",
    "## Decisions",
    "",
    ...packet.evaluations.map(
      (evaluation) =>
        `- ${evaluation.invoiceId}: ${evaluation.customerName} - ${evaluation.decision} (${evaluation.revenueAction})`,
    ),
    "",
  ]

  fs.writeFileSync(path.join(outDir, "finance-review-packet.md"), `${lines.join("\n")}\n`)
}

function writeSvg() {
  const colors = { release: "#2f9e44", "hold-for-review": "#f08c00", block: "#c92a2a" }
  const rows = packet.evaluations
    .map((evaluation, index) => {
      const y = 150 + index * 52
      return `
  <g transform="translate(52 ${y})">
    <rect width="24" height="24" rx="5" fill="${colors[evaluation.decision]}" />
    <text x="42" y="18" font-size="18" font-family="Arial" fill="#111827">${evaluation.invoiceId} - ${evaluation.decision}</text>
    <text x="550" y="18" font-size="16" font-family="Arial" fill="#4b5563">$${evaluation.amountUsd}</text>
  </g>`
    })
    .join("")

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="420" viewBox="0 0 900 420">
  <rect width="900" height="420" fill="#f8fafc"/>
  <text x="52" y="62" font-size="34" font-family="Arial" font-weight="700" fill="#111827">Revenue Sanctions Export Gate</text>
  <text x="52" y="98" font-size="18" font-family="Arial" fill="#4b5563">Release ${packet.summary.release} / Review ${packet.summary["hold-for-review"]} / Block ${packet.summary.block}</text>
  ${rows}
  <text x="52" y="380" font-size="14" font-family="Arial" fill="#6b7280">Audit digest: ${packet.auditDigest.slice(0, 32)}...</text>
</svg>`

  fs.writeFileSync(path.join(outDir, "demo.svg"), `${svg}\n`)
}

function writeMp4() {
  const mp4Path = path.join(outDir, "demo.mp4")
  const font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
  const title = "Revenue Sanctions Export Gate"
  const summary = `Release ${packet.summary.release}  Review ${packet.summary["hold-for-review"]}  Block ${packet.summary.block}`
  const held = `Held or blocked revenue: $${packet.summary.heldRevenue}`
  const filter = [
    `drawtext=fontfile=${font}:text='${title}':x=60:y=80:fontsize=34:fontcolor=white`,
    `drawtext=fontfile=${font}:text='${summary}':x=60:y=150:fontsize=28:fontcolor=white`,
    `drawtext=fontfile=${font}:text='${held}':x=60:y=220:fontsize=24:fontcolor=white`,
    `drawtext=fontfile=${font}:text='Signed finance and compliance event packet generated':x=60:y=290:fontsize=22:fontcolor=white`,
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

console.log(`Wrote revenue sanctions export gate artifacts to ${outDir}`)
