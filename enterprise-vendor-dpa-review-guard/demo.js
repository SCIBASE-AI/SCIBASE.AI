const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { spawnSync } = require("node:child_process");
const { summarizeVendorPortfolio } = require("./index");
const { policy, vendorRequests } = require("./sample-data");

const reportsDir = join(__dirname, "reports");
mkdirSync(reportsDir, { recursive: true });

const summary = summarizeVendorPortfolio(vendorRequests, policy);

writeFileSync(
  join(reportsDir, "vendor-dpa-review-packet.json"),
  `${JSON.stringify(summary, null, 2)}\n`
);
writeFileSync(join(reportsDir, "vendor-dpa-review-report.md"), renderMarkdown(summary));
writeFileSync(join(reportsDir, "summary.svg"), renderSvg(summary));
writeDemoVideo(summary);

console.log(
  `status=${Object.entries(summary.byStatus).map(([status, count]) => `${status}:${count}`).join(",")} digest=${summary.auditDigest}`
);

function renderMarkdown(summary) {
  const lines = [
    "# Enterprise Vendor DPA Review Guard",
    "",
    `Audit digest: \`${summary.auditDigest}\``,
    "",
    "## Status Summary",
    "",
  ];

  for (const [status, count] of Object.entries(summary.byStatus)) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push("", "## Admin Actions", "");
  for (const action of summary.adminActions) {
    lines.push(
      `- ${action.vendorName} (${action.status}): ${action.actionCodes.join(", ")}`
    );
  }

  lines.push("", "## Decisions", "");
  for (const decision of summary.decisions) {
    const findings = [...decision.blockers, ...decision.warnings].map((item) => item.code);
    lines.push(
      `- ${decision.vendorName}: ${decision.status}; findings=${findings.length ? findings.join(", ") : "none"}; digest=${decision.auditDigest}`
    );
  }

  return `${lines.join("\n")}\n`;
}

function renderSvg(summary) {
  const approve = summary.byStatus.approve_vendor || 0;
  const review = summary.byStatus.needs_legal_review || 0;
  const hold = summary.byStatus.hold_vendor || 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Enterprise vendor DPA review summary">
  <rect width="960" height="540" fill="#101828"/>
  <text x="56" y="76" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="700">Enterprise Vendor DPA Review Guard</text>
  <text x="56" y="120" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="18">Synthetic vendor requests evaluated before institutional enablement.</text>
  ${bar(56, 178, approve, summary.totalVendors, "#22c55e", "Approved")}
  ${bar(56, 260, review, summary.totalVendors, "#f59e0b", "Legal review")}
  ${bar(56, 342, hold, summary.totalVendors, "#ef4444", "Hold")}
  <text x="56" y="468" fill="#94a3b8" font-family="monospace" font-size="15">digest ${summary.auditDigest.slice(0, 32)}</text>
</svg>
`;
}

function bar(x, y, value, total, color, label) {
  const width = Math.max(12, Math.round((value / total) * 620));
  return `<text x="${x}" y="${y - 16}" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="20">${label}: ${value}</text>
  <rect x="${x}" y="${y}" width="620" height="32" rx="6" fill="#1f2937"/>
  <rect x="${x}" y="${y}" width="${width}" height="32" rx="6" fill="${color}"/>`;
}

function writeDemoVideo(summary) {
  const output = join(reportsDir, "demo.mp4");
  const frameDir = mkdtempSync(join(tmpdir(), "vendor-dpa-demo-"));

  for (let index = 0; index < 60; index += 1) {
    writeFileSync(
      join(frameDir, `frame-${String(index).padStart(3, "0")}.ppm`),
      renderFrame(summary, (index + 1) / 60)
    );
  }

  const result = spawnSync("ffmpeg", [
    "-y",
    "-framerate",
    "15",
    "-i",
    join(frameDir, "frame-%03d.ppm"),
    "-pix_fmt",
    "yuv420p",
    output,
  ], { encoding: "utf8" });

  rmSync(frameDir, { recursive: true, force: true });

  if (result.status !== 0) {
    throw new Error(`ffmpeg demo generation failed: ${result.stderr}`);
  }
}

function renderFrame(summary, progress) {
  const width = 960;
  const height = 540;
  const pixels = Buffer.alloc(width * height * 3);
  fillRect(pixels, width, 0, 0, width, height, [16, 24, 40]);
  fillRect(pixels, width, 56, 72, 848, 44, [30, 41, 59]);
  fillRect(pixels, width, 56, 128, 520, 18, [71, 85, 105]);
  fillRect(pixels, width, 56, 458, 500, 12, [71, 85, 105]);

  drawStatusBar(pixels, width, 56, 178, summary.byStatus.approve_vendor || 0, summary.totalVendors, progress, [34, 197, 94]);
  drawStatusBar(pixels, width, 56, 260, summary.byStatus.needs_legal_review || 0, summary.totalVendors, progress, [245, 158, 11]);
  drawStatusBar(pixels, width, 56, 342, summary.byStatus.hold_vendor || 0, summary.totalVendors, progress, [239, 68, 68]);

  const header = Buffer.from(`P6\n${width} ${height}\n255\n`);
  return Buffer.concat([header, pixels]);
}

function drawStatusBar(pixels, width, x, y, value, total, progress, color) {
  fillRect(pixels, width, x, y - 30, 180, 18, [203, 213, 225]);
  fillRect(pixels, width, x, y, 620, 32, [31, 41, 55]);
  fillRect(pixels, width, x, y, Math.max(8, Math.round((value / total) * 620 * progress)), 32, color);
  fillRect(pixels, width, x + 650, y, 32 + value * 24, 32, color);
}

function fillRect(pixels, width, x, y, rectWidth, rectHeight, color) {
  for (let row = y; row < y + rectHeight; row += 1) {
    for (let column = x; column < x + rectWidth; column += 1) {
      const offset = (row * width + column) * 3;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
    }
  }
}
