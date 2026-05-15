import fs from "node:fs"

import { buildReviewerPacket } from "../src/consent-access-broker.js"

const workspace = JSON.parse(fs.readFileSync("data/sample-workspace.json", "utf8"))
const packet = buildReviewerPacket(workspace)

fs.mkdirSync("docs", { recursive: true })
fs.writeFileSync("docs/demo-output.json", `${JSON.stringify(packet, null, 2)}\n`)

const transcript = [
  "# Research Consent Access Broker Demo",
  "",
  `Generated: ${packet.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Projects evaluated: ${packet.summary.projects}`,
  `- Researchers evaluated: ${packet.summary.researchers}`,
  `- Protected objects evaluated: ${packet.summary.objects}`,
  `- Allowed decisions: ${packet.summary.allowed}`,
  `- Held decisions: ${packet.summary.held}`,
  `- Invitation holds: ${packet.summary.invitationHolds}`,
  `- Grant drift findings: ${packet.summary.grantDrift}`,
  "",
  "## Top hold reasons",
  "",
  ...Object.entries(packet.heldByReason).map(([reason, count]) => `- ${reason}: ${count}`),
  "",
  "## Reviewer checklist",
  "",
  ...packet.reviewerChecklist.map((item) => `- ${item}`),
]

fs.writeFileSync("docs/demo-transcript.md", `${transcript.join("\n")}\n`)
console.log(transcript.join("\n"))
