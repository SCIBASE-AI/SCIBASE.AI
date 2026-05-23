const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { evaluateChallengeEvaluatorCalibration } = require("./index")
const { challenges, policy } = require("./sample-data")

const reportsDir = path.join(__dirname, "reports")
fs.mkdirSync(reportsDir, { recursive: true })

const packet = evaluateChallengeEvaluatorCalibration({
  asOf: "2026-05-23T21:45:00.000Z",
  challenges,
  policy,
})

fs.writeFileSync(
  path.join(reportsDir, "calibration-review-packet.json"),
  `${JSON.stringify(packet, null, 2)}\n`,
)

const markdown = [
  "# Challenge Evaluator Calibration Guard Report",
  "",
  `Challenges reviewed: ${packet.summary.totalChallenges}`,
  `Ready for live scoring: ${packet.summary.readyChallenges}`,
  `Needs recalibration: ${packet.summary.recalibrationChallenges}`,
  `Held from live scoring: ${packet.summary.heldChallenges}`,
  `Seed submissions reviewed: ${packet.summary.totalSeeds}`,
  `Calibration scores reviewed: ${packet.summary.totalCalibrationScores}`,
  `Critical findings: ${packet.summary.criticalFindings}`,
  `Warning findings: ${packet.summary.warningFindings}`,
  `Audit digest: \`${packet.audit.digest}\``,
  "",
  "## Challenge Decisions",
  ...packet.challenges.flatMap((challenge) => [
    "",
    `### ${challenge.title}`,
    `- Status: ${challenge.status}`,
    `- Criteria: ${challenge.summary.criteria}`,
    `- Seeds: ${challenge.summary.seeds}`,
    `- Eligible evaluators: ${challenge.summary.eligibleEvaluators}`,
    `- Finding codes: ${challenge.findings.map((finding) => finding.code).join(", ") || "none"}`,
  ]),
  "",
  "## Recalibration Queue",
  ...packet.recalibrationQueue.map((item) => (
    `- ${item.challengeId}: ${item.action} (${item.findingCodes.join(", ")})`
  )),
  "",
]

fs.writeFileSync(path.join(reportsDir, "calibration-review-report.md"), markdown.join("\n"))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#101820"/>
  <text x="48" y="78" fill="#f8fafc" font-family="Arial" font-size="34" font-weight="700">Challenge Evaluator Calibration Guard</text>
  <text x="48" y="122" fill="#cbd5e1" font-family="Arial" font-size="18">Seed coverage, severity drift, inter-rater spread, and normalization gates</text>
  <rect x="48" y="172" width="250" height="150" rx="8" fill="#047857"/>
  <text x="78" y="232" fill="#ecfdf5" font-family="Arial" font-size="56" font-weight="700">${packet.summary.readyChallenges}</text>
  <text x="78" y="272" fill="#a7f3d0" font-family="Arial" font-size="22">live-ready</text>
  <rect x="355" y="172" width="250" height="150" rx="8" fill="#ca8a04"/>
  <text x="385" y="232" fill="#fefce8" font-family="Arial" font-size="56" font-weight="700">${packet.summary.recalibrationChallenges}</text>
  <text x="385" y="272" fill="#fef08a" font-family="Arial" font-size="22">recalibrate</text>
  <rect x="662" y="172" width="250" height="150" rx="8" fill="#be123c"/>
  <text x="692" y="232" fill="#ffe4e6" font-family="Arial" font-size="56" font-weight="700">${packet.summary.heldChallenges}</text>
  <text x="692" y="272" fill="#fecdd3" font-family="Arial" font-size="22">held</text>
  <text x="48" y="386" fill="#e2e8f0" font-family="Arial" font-size="20">Controls: rubric coverage, evaluator role exclusions, conflicts, drift, spread, and score anchors.</text>
  <text x="48" y="426" fill="#94a3b8" font-family="Arial" font-size="16">Digest ${packet.audit.digest.slice(0, 28)}...</text>
</svg>
`

fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg)

const ffmpeg = spawnSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0x101820:s=960x540:d=5:r=15",
  "-vf",
  "drawbox=x=48:y=172:w=250:h=150:color=0x047857@1:t=fill,drawbox=x=355:y=172:w=250:h=150:color=0xca8a04@1:t=fill,drawbox=x=662:y=172:w=250:h=150:color=0xbe123c@1:t=fill,drawbox=x=48:y=368:w=864:h=18:color=0x38bdf8@1:t=fill",
  "-pix_fmt",
  "yuv420p",
  path.join(reportsDir, "demo.mp4"),
], { stdio: "ignore" })

if (ffmpeg.status !== 0) {
  console.warn("ffmpeg video generation failed; JSON, Markdown, and SVG reports were still generated.")
}

console.log(`Wrote challenge evaluator calibration artifacts to ${reportsDir}`)
