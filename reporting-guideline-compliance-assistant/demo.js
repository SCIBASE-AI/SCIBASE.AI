import { mkdir, writeFile } from "node:fs/promises"
import { manuscripts } from "./sample-data.js"
import {
  analyzeBatch,
  renderMarkdownReport,
  renderSvgSummary,
} from "./index.js"

const reportDir = new URL("./reports/", import.meta.url)
await mkdir(reportDir, { recursive: true })

const batch = analyzeBatch(manuscripts)
const markdown = renderMarkdownReport(batch)
const svg = renderSvgSummary(batch)
const script = [
  "Reporting Guideline Compliance Assistant demo",
  "",
  "1. Load three synthetic manuscripts: clinical trial, systematic review, observational cohort.",
  "2. Match each manuscript to CONSORT, PRISMA, STROBE, and cross-guideline checks.",
  "3. Emit reviewer actions, readiness scores, and guideline citation recommendations.",
  "",
  `Average readiness score: ${batch.averageScore}/100`,
  `Ready manuscripts: ${batch.readyCount}/${batch.packets.length}`,
  "",
  ...batch.packets.map(
    (packet) =>
      `${packet.manuscriptId}: ${packet.readiness} (${packet.readinessScore}/100)`
  ),
].join("\n")

await writeFile(new URL("reporting-guideline-packet.json", reportDir), `${JSON.stringify(batch, null, 2)}\n`)
await writeFile(new URL("reviewer-packet.md", reportDir), markdown)
await writeFile(new URL("summary.svg", reportDir), svg)
await writeFile(new URL("demo-script.txt", reportDir), `${script}\n`)

console.log(script)
