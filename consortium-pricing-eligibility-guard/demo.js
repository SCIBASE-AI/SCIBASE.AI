const fs = require("fs")
const path = require("path")
const {
  auditConsortiumPricing,
  buildExecutiveSummary,
  createAuditDigest,
} = require("./index")
const { consortiums, invoices } = require("./sample-data")

const outputDir = path.join(__dirname, "demo-output")
fs.mkdirSync(outputDir, { recursive: true })

const audit = auditConsortiumPricing({
  invoices,
  consortiums,
  generatedAt: "2026-05-20T10:00:00Z",
})

const packetWithDigests = {
  ...audit,
  executiveSummary: buildExecutiveSummary(audit),
  packets: audit.packets.map((packet) => ({
    ...packet,
    digest: createAuditDigest(packet),
  })),
}

fs.writeFileSync(
  path.join(outputDir, "audit-packets.json"),
  JSON.stringify(packetWithDigests, null, 2),
)

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatCurrency(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString("en-US")}`
}

const rowSvg = packetWithDigests.packets
  .map((packet, index) => {
    const y = 254 + index * 78
    const statusColor = packet.invoiceHold ? "#f97316" : "#22c55e"
    const flagText = packet.flags.length > 0 ? packet.flags.map((flag) => flag.code).join(", ") : "no flags"
    return `<g>
      <rect x="86" y="${y - 38}" width="1108" height="60" rx="14" fill="#172033" stroke="${statusColor}" stroke-width="2"/>
      <text x="112" y="${y - 10}" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#f8fafc">${escapeXml(packet.invoiceId)} - ${escapeXml(packet.decision)}</text>
      <text x="112" y="${y + 18}" font-family="Arial, sans-serif" font-size="18" fill="#cbd5e1">${escapeXml(packet.consortiumName)} | net ${formatCurrency(packet.netAmountUsd)} | ${escapeXml(flagText)}</text>
    </g>`
  })
  .join("\n")

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#0f172a"/>
  <rect x="54" y="48" width="1172" height="624" rx="22" fill="#111827" stroke="#38bdf8" stroke-width="3"/>
  <text x="86" y="116" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#f8fafc">Consortium Pricing Eligibility Guard</text>
  <text x="86" y="166" font-family="Arial, sans-serif" font-size="24" fill="#cbd5e1">Academic consortium discount checks for Revenue Infrastructure #20</text>
  <rect x="86" y="192" width="332" height="42" rx="10" fill="#7f1d1d"/>
  <text x="106" y="220" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#fee2e2">${audit.summary.heldInvoices} held invoices</text>
  <rect x="446" y="192" width="348" height="42" rx="10" fill="#14532d"/>
  <text x="466" y="220" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#dcfce7">${audit.summary.approvedInvoices} approved invoices</text>
  <rect x="822" y="192" width="372" height="42" rx="10" fill="#1e3a8a"/>
  <text x="842" y="220" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#dbeafe">${formatCurrency(audit.summary.totalListAmountUsd)} gross exposure</text>
  ${rowSvg}
  <text x="86" y="628" font-family="Arial, sans-serif" font-size="20" fill="#bae6fd">${audit.summary.heldInvoices} held / ${audit.summary.approvedInvoices} approved across ${audit.summary.totalInvoices} invoices; ${formatCurrency(audit.summary.totalListAmountUsd)} gross exposure.</text>
  <text x="86" y="656" font-family="Arial, sans-serif" font-size="18" fill="#94a3b8">Synthetic data only. No payment credentials, no live billing APIs, no private institution data.</text>
</svg>`

fs.writeFileSync(path.join(outputDir, "demo.svg"), svg)

console.log(`Wrote ${packetWithDigests.packets.length} audit packets to ${path.join(outputDir, "audit-packets.json")}`)
console.log(`Wrote visual demo to ${path.join(outputDir, "demo.svg")}`)
