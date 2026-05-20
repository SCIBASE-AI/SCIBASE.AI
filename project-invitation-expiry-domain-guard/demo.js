"use strict";

const fs = require("fs");
const path = require("path");
const { createInvitationReviewPacket } = require("./index");
const { invitationPacket } = require("./sample-data");

function reportsDir() {
  const dir = path.join(__dirname, "reports");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function markdown(packet) {
  return [
    "# Project Invitation Review Packet",
    "",
    `Project: ${packet.projectId}`,
    `Evaluated at: ${packet.evaluatedAt}`,
    "",
    "## Summary",
    `- Ready invitations: ${packet.readyInvitations.join(", ") || "none"}`,
    `- Held invitations: ${packet.heldInvitations.join(", ") || "none"}`,
    "",
    "## Held Reasons",
    ...packet.evaluations
      .filter((invite) => invite.holds.length > 0)
      .map((invite) => `- ${invite.inviteId} (${invite.email}): ${invite.holds.join(", ")}`),
    "",
  ].join("\n");
}

function svg(packet) {
  const rows = packet.evaluations.map((invite, index) => {
    const y = 150 + index * 55;
    const color = invite.status === "ready-to-send" ? "#247c7a" : "#b33f62";
    return `
      <text x="48" y="${y}" font-size="17" fill="#17324d">${invite.inviteId}</text>
      <text x="138" y="${y}" font-size="17" fill="#17324d">${invite.email}</text>
      <text x="390" y="${y}" font-size="16" fill="#496272">${invite.role}</text>
      <rect x="520" y="${y - 20}" width="190" height="28" rx="6" fill="${color}"/>
      <text x="538" y="${y}" font-size="15" fill="#fff">${invite.status}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="430" viewBox="0 0 760 430">
    <rect width="760" height="430" fill="#f7fbfb"/>
    <rect x="24" y="24" width="712" height="382" rx="14" fill="#fff" stroke="#c7d9d6"/>
    <text x="48" y="72" font-size="27" font-family="Arial, sans-serif" font-weight="700" fill="#17324d">Invitation expiry and domain guard</text>
    <text x="48" y="104" font-size="16" font-family="Arial, sans-serif" fill="#496272">Ready: ${packet.readyInvitations.length}; held: ${packet.heldInvitations.length}</text>
    <g font-family="Arial, sans-serif">${rows}</g>
  </svg>`;
}

function runDemo() {
  const packet = createInvitationReviewPacket(invitationPacket);
  const dir = reportsDir();
  fs.writeFileSync(path.join(dir, "invitation-review-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "invitation-review-packet.md"), `${markdown(packet)}\n`);
  fs.writeFileSync(path.join(dir, "invitation-summary.svg"), svg(packet));
  return packet;
}

if (require.main === module) {
  const packet = runDemo();
  console.log(JSON.stringify({
    ready: packet.readyInvitations.length,
    held: packet.heldInvitations.length,
  }, null, 2));
}

module.exports = { runDemo, markdown, svg };
