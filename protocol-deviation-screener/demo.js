const fs = require("fs")
const path = require("path")
const {
  screenProtocolDeviation,
  buildSummaryModes,
  createAuditDigest,
} = require("./index")
const { protocol, riskyManuscript, alignedManuscript } = require("./sample-data")

const outputDir = path.join(__dirname, "demo-output")
fs.mkdirSync(outputDir, { recursive: true })

const riskyAudit = screenProtocolDeviation(protocol, riskyManuscript)
const alignedAudit = screenProtocolDeviation(protocol, alignedManuscript)
const packets = [riskyAudit, alignedAudit].map((audit) => ({
  ...audit,
  digest: createAuditDigest(audit),
  summaries: buildSummaryModes(audit),
}))

fs.writeFileSync(
  path.join(outputDir, "audit-packets.json"),
  JSON.stringify(packets, null, 2),
)

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const riskRows = riskyAudit.flags
  .map((flag, index) => {
    const y = 238 + index * 42
    return `<text x="98" y="${y}" font-size="24" fill="#fee2e2">${escapeXml(flag.code)} - ${escapeXml(flag.severity)}</text>`
  })
  .join("\n")

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#111827"/>
  <rect x="64" y="56" width="1152" height="608" rx="24" fill="#172033" stroke="#38bdf8" stroke-width="3"/>
  <text x="96" y="126" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#f8fafc">Protocol Deviation Screener</text>
  <text x="96" y="176" font-family="Arial, sans-serif" font-size="25" fill="#cbd5e1">Evidence-backed preregistration review packet</text>
  <text x="96" y="218" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#fca5a5">Risky draft: ${riskyAudit.flags.length} flags, score ${riskyAudit.riskScore}</text>
  <g font-family="Arial, sans-serif">${riskRows}</g>
  <rect x="748" y="220" width="390" height="144" rx="16" fill="#064e3b"/>
  <text x="780" y="275" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#d1fae5">Aligned draft</text>
  <text x="780" y="324" font-family="Arial, sans-serif" font-size="24" fill="#bbf7d0">readyForReview: ${alignedAudit.readyForReview}</text>
  <text x="96" y="584" font-family="Arial, sans-serif" font-size="23" fill="#bae6fd">Digest: ${createAuditDigest(riskyAudit)}</text>
  <text x="96" y="626" font-family="Arial, sans-serif" font-size="22" fill="#cbd5e1">Synthetic data only. No external APIs, credentials, or uploaded papers.</text>
</svg>`

fs.writeFileSync(path.join(outputDir, "demo.svg"), svg)

console.log(`Wrote ${packets.length} audit packets to ${path.join(outputDir, "audit-packets.json")}`)
console.log(`Wrote visual demo to ${path.join(outputDir, "demo.svg")}`)
