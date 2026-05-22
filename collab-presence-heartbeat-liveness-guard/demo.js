const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { evaluatePresenceLiveness } = require("./index")
const { rooms, policy } = require("./sample-data")

const reportsDir = path.join(__dirname, "reports")
fs.mkdirSync(reportsDir, { recursive: true })

const packet = evaluatePresenceLiveness({
  asOf: "2026-05-23T01:20:00.000Z",
  rooms,
  policy,
})

fs.writeFileSync(
  path.join(reportsDir, "presence-liveness-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`,
)

const markdown = [
  "# Collaborative Presence Heartbeat Liveness Report",
  "",
  `Rooms reviewed: ${packet.summary.totalRooms}`,
  `Sessions reviewed: ${packet.summary.totalSessions}`,
  `Published sessions: ${packet.summary.publishedSessions}`,
  `Suppressed sessions: ${packet.summary.suppressedSessions}`,
  `Cleanup actions: ${packet.summary.cleanupActions}`,
  `Recovery actions: ${packet.summary.recoveryActions}`,
  `Fanout events: ${packet.summary.fanoutEvents}`,
  `Audit digest: \`${packet.audit.digest}\``,
  "",
  "## Room Decisions",
  ...packet.rooms.flatMap((room) => [
    "",
    `### ${room.title}`,
    `- Status: ${room.status}`,
    `- Reviewed sessions: ${room.reviewedSessions}`,
    `- Published sessions: ${room.publishedSessions}`,
    `- Suppressed sessions: ${room.suppressedSessions}`,
    `- Cleanup codes: ${room.cleanupQueue.map((item) => item.code).join(", ") || "none"}`,
    `- Recovery codes: ${room.recoveryQueue.map((item) => item.code).join(", ") || "none"}`,
  ]),
  "",
  "## Cleanup Queue",
  ...packet.cleanupQueue.map((item) => (
    `- ${item.roomId}/${item.sessionId}: ${item.code} (${item.severity})`
  )),
  "",
]

fs.writeFileSync(path.join(reportsDir, "presence-liveness-report.md"), markdown.join("\n"))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#101827"/>
  <text x="48" y="78" fill="#f8fafc" font-family="Arial" font-size="34" font-weight="700">Collaborative Presence Heartbeat Liveness Guard</text>
  <text x="48" y="122" fill="#cbd5e1" font-family="Arial" font-size="18">Ghost session cleanup before live cursor and presence fanout</text>
  <rect x="48" y="170" width="250" height="150" rx="12" fill="#047857"/>
  <text x="78" y="230" fill="#d1fae5" font-family="Arial" font-size="56" font-weight="700">${packet.summary.publishedSessions}</text>
  <text x="78" y="270" fill="#a7f3d0" font-family="Arial" font-size="22">published</text>
  <rect x="355" y="170" width="250" height="150" rx="12" fill="#b45309"/>
  <text x="385" y="230" fill="#fffbeb" font-family="Arial" font-size="56" font-weight="700">${packet.summary.recoveryActions}</text>
  <text x="385" y="270" fill="#fde68a" font-family="Arial" font-size="22">recoverable</text>
  <rect x="662" y="170" width="250" height="150" rx="12" fill="#be123c"/>
  <text x="692" y="230" fill="#ffe4e6" font-family="Arial" font-size="56" font-weight="700">${packet.summary.suppressedSessions}</text>
  <text x="692" y="270" fill="#fecdd3" font-family="Arial" font-size="22">suppressed</text>
  <text x="48" y="386" fill="#e2e8f0" font-family="Arial" font-size="20">Controls: stale heartbeat, ghost session, duplicate tab, orphan cursor, expired typing, expired fanout lease.</text>
  <text x="48" y="426" fill="#94a3b8" font-family="Arial" font-size="16">Digest ${packet.audit.digest.slice(0, 28)}...</text>
</svg>
`

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg)

const ffmpeg = spawnSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0x101827:s=960x540:d=5:r=15",
  "-vf",
  "drawbox=x=48:y=170:w=250:h=150:color=0x047857@1:t=fill,drawbox=x=355:y=170:w=250:h=150:color=0xb45309@1:t=fill,drawbox=x=662:y=170:w=250:h=150:color=0xbe123c@1:t=fill,drawbox=x=48:y=368:w=864:h=18:color=0x22d3ee@1:t=fill",
  "-pix_fmt",
  "yuv420p",
  path.join(reportsDir, "demo.mp4"),
], { stdio: "ignore" })

if (ffmpeg.status !== 0) {
  console.warn("ffmpeg video generation failed; JSON, Markdown, and SVG reports were still generated.")
}

console.log(`Wrote collaborative presence liveness artifacts to ${reportsDir}`)
