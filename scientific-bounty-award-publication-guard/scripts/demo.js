import { mkdir, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { tmpdir } from "node:os"
import packets from "../examples/award-publication-packets.json" with { type: "json" }
import { evaluateAwardPublicationBatch, summarize } from "../src/index.js"

const ARTIFACT_DIR = new URL("../artifacts/", import.meta.url)
const now = "2026-06-12T00:00:00Z"
const results = evaluateAwardPublicationBatch(packets, { now })
const summary = summarize(results)

await mkdir(ARTIFACT_DIR, { recursive: true })
await writeFile(new URL("award-publication-results.json", ARTIFACT_DIR), `${JSON.stringify(results, null, 2)}\n`)
await writeFile(new URL("award-publication-report.md", ARTIFACT_DIR), renderReport(results, summary))
await writeFile(new URL("award-publication-summary.svg", ARTIFACT_DIR), renderSvg(results, summary))
await renderMp4()

console.log("Award publication guard demo generated")
console.log(`- decisions: ${results.map((result) => `${result.challengeId}:${result.decision}`).join(", ")}`)
console.log(`- summary: ${JSON.stringify(summary)}`)

function renderReport(results, summary) {
  const lines = [
    "# Award Publication Readiness Report",
    "",
    `Generated: ${now}`,
    "",
    "## Summary",
    "",
    `- Blocking findings: ${summary.blocks}`,
    `- Review findings: ${summary.reviews}`,
    `- Passing findings: ${summary.passes}`,
    "",
    "## Challenge Decisions",
    ""
  ]

  for (const result of results) {
    lines.push(`### ${result.challengeId}`)
    lines.push("")
    lines.push(`- Decision: ${result.decision}`)
    lines.push(`- Award: ${result.awardId}`)
    lines.push(`- Payout state: ${result.audit.payoutState}`)
    lines.push(`- Public mode: ${result.audit.publicMode}`)
    lines.push("")
    lines.push("| Severity | Code | Message | Remediation |")
    lines.push("| --- | --- | --- | --- |")
    for (const finding of result.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${finding.message} | ${finding.remediation} |`)
    }
    lines.push("")
  }

  return `${lines.join("\n")}\n`
}

function renderSvg(results, summary) {
  const rows = results.map((result, index) => {
    const y = 128 + index * 64
    const color = result.decision === "RELEASE_PUBLICATION" ? "#15803d" : result.decision === "HOLD_FOR_REVIEW" ? "#b45309" : "#b91c1c"
    return `
      <text x="40" y="${y}" class="label">${escapeXml(result.challengeId)}</text>
      <rect x="520" y="${y - 26}" width="250" height="36" rx="6" fill="${color}" />
      <text x="545" y="${y - 3}" class="decision">${result.decision}</text>`
  }).join("\n")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="360" viewBox="0 0 900 360">
  <rect width="900" height="360" fill="#f8fafc"/>
  <text x="40" y="58" class="title">Scientific Bounty Award Publication Guard</text>
  <text x="40" y="92" class="meta">blocks=${summary.blocks} reviews=${summary.reviews} passes=${summary.passes}</text>
  ${rows}
  <style>
    .title { font: 700 28px Arial, sans-serif; fill: #0f172a; }
    .meta { font: 16px Arial, sans-serif; fill: #475569; }
    .label { font: 16px Arial, sans-serif; fill: #111827; }
    .decision { font: 700 13px Arial, sans-serif; fill: white; }
  </style>
</svg>
`
}

async function renderMp4() {
  const ppmPath = join(tmpdir(), `award-publication-demo-frame-${Date.now()}.ppm`)
  const mp4Path = new URL("award-publication-demo.mp4", ARTIFACT_DIR)
  await writeFile(ppmPath, renderPpmFrame())

  const ffmpeg = spawnSync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-loop",
    "1",
    "-framerate",
    "1",
    "-i",
    ppmPath,
    "-t",
    "5",
    "-pix_fmt",
    "yuv420p",
    mp4Path.pathname
  ], { encoding: "utf8" })

  if (ffmpeg.status !== 0) {
    await writeFile(new URL("award-publication-demo-fallback.txt", ARTIFACT_DIR), ffmpeg.stderr || "ffmpeg failed")
    return
  }
}

function renderPpmFrame() {
  const width = 900
  const height = 360
  const pixels = Buffer.alloc(width * height * 3, 248)

  fillRect(pixels, width, 0, 0, width, height, [248, 250, 252])
  fillRect(pixels, width, 40, 50, 820, 34, [15, 23, 42])
  fillRect(pixels, width, 40, 112, 250, 72, [21, 128, 61])
  fillRect(pixels, width, 325, 112, 250, 72, [180, 83, 9])
  fillRect(pixels, width, 610, 112, 250, 72, [185, 28, 28])
  fillRect(pixels, width, 40, 224, 820, 56, [226, 232, 240])
  fillRect(pixels, width, 40, 304, 260, 18, [21, 128, 61])
  fillRect(pixels, width, 320, 304, 180, 18, [180, 83, 9])
  fillRect(pixels, width, 520, 304, 300, 18, [185, 28, 28])

  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "ascii")
  return Buffer.concat([header, pixels])
}

function fillRect(pixels, imageWidth, x, y, width, height, rgb) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      const offset = (row * imageWidth + col) * 3
      pixels[offset] = rgb[0]
      pixels[offset + 1] = rgb[1]
      pixels[offset + 2] = rgb[2]
    }
  }
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}
