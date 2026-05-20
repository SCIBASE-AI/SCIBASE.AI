"use strict";

const fs = require("fs");
const path = require("path");
const { createDowngradeReviewPacket } = require("./index");
const { downgradePacket } = require("./sample-data");

function reportsDir() {
  const dir = path.join(__dirname, "reports");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function markdown(packet) {
  return [
    "# Subscription Entitlement Downgrade Packet",
    "",
    `Account: ${packet.accountId}`,
    `Plan change: ${packet.fromPlan} -> ${packet.toPlan}`,
    `Status: ${packet.status}`,
    "",
    "## Holds",
    ...packet.holds.map((hold, index) => `- ${hold}: ${packet.remediation[index]}`),
    "",
  ].join("\n");
}

function svg(packet) {
  const rows = [
    ["Seats", packet.metrics.activeSeats, packet.metrics.requestedSeatLimit],
    ["Storage GB", packet.metrics.storageGb, packet.metrics.requestedStorageGb],
    ["Compute h", packet.metrics.committedComputeHours, packet.metrics.requestedComputeHours],
  ].map(([label, used, limit], index) => {
    const y = 160 + index * 68;
    const width = Math.min(420, Math.round((used / limit) * 260));
    const color = used > limit ? "#b33f62" : "#247c7a";
    return `
      <text x="48" y="${y}" font-size="18" fill="#17324d">${label}</text>
      <rect x="190" y="${y - 22}" width="260" height="28" rx="6" fill="#dbe7ee"/>
      <rect x="190" y="${y - 22}" width="${width}" height="28" rx="6" fill="${color}"/>
      <text x="480" y="${y}" font-size="16" fill="#17324d">${used} / ${limit}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420">
    <rect width="720" height="420" fill="#f8fbfa"/>
    <rect x="24" y="24" width="672" height="372" rx="14" fill="#fff" stroke="#c7d9d6"/>
    <text x="48" y="72" font-size="27" font-family="Arial, sans-serif" font-weight="700" fill="#17324d">Entitlement downgrade guard</text>
    <text x="48" y="104" font-size="16" font-family="Arial, sans-serif" fill="#496272">${packet.fromPlan} to ${packet.toPlan}: ${packet.status}</text>
    <g font-family="Arial, sans-serif">${rows}</g>
    <text x="48" y="356" font-size="15" font-family="Arial, sans-serif" fill="#496272">Holds: ${packet.holds.length}; unpaid invoices: ${packet.metrics.unpaidInvoiceCount}; commitment days: ${packet.metrics.commitmentDaysRemaining}</text>
  </svg>`;
}

function runDemo() {
  const packet = createDowngradeReviewPacket(downgradePacket);
  const dir = reportsDir();
  fs.writeFileSync(path.join(dir, "downgrade-review-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "downgrade-review-packet.md"), `${markdown(packet)}\n`);
  fs.writeFileSync(path.join(dir, "downgrade-summary.svg"), svg(packet));
  return packet;
}

if (require.main === module) {
  const packet = runDemo();
  console.log(JSON.stringify({
    status: packet.status,
    holds: packet.holds.length,
  }, null, 2));
}

module.exports = { runDemo, markdown, svg };
