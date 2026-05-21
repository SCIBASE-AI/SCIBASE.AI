const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { evaluateEthicsProvenance } = require("./index")
const { sampleRecommendations, sampleUserContext } = require("./sample-data")

const reportsDir = path.join(__dirname, "reports")
fs.mkdirSync(reportsDir, { recursive: true })

const packet = evaluateEthicsProvenance({
  recommendations: sampleRecommendations,
  userContext: sampleUserContext,
})

fs.writeFileSync(
  path.join(reportsDir, "ethics-provenance-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`,
)

const held = packet.decisions.filter((decision) => decision.status === "hold")
const visible = packet.decisions.filter((decision) => decision.status === "show")

const markdown = [
  "# Knowledge Graph Ethics Provenance Guard Report",
  "",
  `Generated decisions: ${packet.decisions.length}`,
  `Visible recommendations: ${visible.length}`,
  `Held recommendations: ${held.length}`,
  `Curator actions: ${packet.audit.curatorActions}`,
  `Audit digest: \`${packet.audit.digest}\``,
  "",
  "## Held Recommendations",
  ...held.flatMap((decision) => [
    "",
    `### ${decision.title}`,
    `- Risk score: ${decision.riskScore}`,
    `- Blockers: ${decision.blockers.map((blocker) => blocker.code).join(", ")}`,
    `- First action: ${decision.curatorActions[0]?.message || "none"}`,
  ]),
  "",
]

fs.writeFileSync(path.join(reportsDir, "ethics-provenance-report.md"), markdown.join("\n"))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#111827"/>
  <text x="48" y="78" fill="#f9fafb" font-family="Arial" font-size="34" font-weight="700">Knowledge Graph Ethics Provenance Guard</text>
  <text x="48" y="124" fill="#cbd5e1" font-family="Arial" font-size="18">Synthetic recommendation review packet for SCIBASE issue #17</text>
  <rect x="48" y="170" width="250" height="150" rx="14" fill="#0f766e"/>
  <text x="78" y="230" fill="#ecfeff" font-family="Arial" font-size="56" font-weight="700">${visible.length}</text>
  <text x="78" y="270" fill="#ccfbf1" font-family="Arial" font-size="22">visible</text>
  <rect x="355" y="170" width="250" height="150" rx="14" fill="#b45309"/>
  <text x="385" y="230" fill="#fff7ed" font-family="Arial" font-size="56" font-weight="700">${held.length}</text>
  <text x="385" y="270" fill="#ffedd5" font-family="Arial" font-size="22">held for ethics review</text>
  <rect x="662" y="170" width="250" height="150" rx="14" fill="#1d4ed8"/>
  <text x="692" y="230" fill="#eff6ff" font-family="Arial" font-size="56" font-weight="700">${packet.audit.curatorActions}</text>
  <text x="692" y="270" fill="#dbeafe" font-family="Arial" font-size="22">curator actions</text>
  <text x="48" y="390" fill="#e5e7eb" font-family="Arial" font-size="20">Checks: IRB, consent scope, biosafety level, animal-care evidence, restricted data use, dual-use review.</text>
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
  "drawbox=x=48:y=170:w=250:h=150:color=0x0f766e@1:t=fill,drawbox=x=355:y=170:w=250:h=150:color=0xb45309@1:t=fill,drawbox=x=662:y=170:w=250:h=150:color=0x1d4ed8@1:t=fill,drawbox=x=48:y=370:w=864:h=18:color=0xfbbf24@1:t=fill",
  "-pix_fmt",
  "yuv420p",
  path.join(reportsDir, "demo.mp4"),
], { stdio: "ignore" })

if (ffmpeg.status !== 0) {
  console.warn("ffmpeg video generation failed; summary.svg and JSON/Markdown reports were still generated.")
}

console.log(`Wrote review artifacts to ${reportsDir}`)
