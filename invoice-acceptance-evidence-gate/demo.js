const fs = require("node:fs");
const path = require("node:path");
const { evaluateInvoiceAcceptance } = require("./index");
const sampleAccounts = require("./sample-data");

const outputDir = path.join(__dirname, "docs");
fs.mkdirSync(outputDir, { recursive: true });

const report = evaluateInvoiceAcceptance(sampleAccounts, {
  asOf: "2026-05-20T00:00:00.000Z",
});

fs.writeFileSync(path.join(outputDir, "demo-output.json"), JSON.stringify(report, null, 2) + "\n");

const ready = report.summary.byReadiness.ready_to_invoice || 0;
const review = report.summary.byReadiness.needs_review || 0;
const blocked = report.summary.byReadiness.blocked || 0;
const max = Math.max(ready, review, blocked, 1);
const bar = (value) => Math.round((value / max) * 440);

const rows = report.actionQueue
  .slice(0, 3)
  .map((item, index) => {
    const y = 330 + index * 38;
    return `<text x="48" y="${y}" class="small">${item.rank}. ${item.eventId} - ${item.reasons.join(", ")} - $${item.leakageRisk}</text>`;
  })
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Invoice acceptance evidence gate demo report">
  <style>
    .bg { fill: #101418; }
    .panel { fill: #172026; stroke: #33424d; stroke-width: 1; }
    .title { fill: #f4f7f8; font: 700 30px system-ui, -apple-system, Segoe UI, sans-serif; }
    .label { fill: #b7c5cc; font: 600 16px system-ui, -apple-system, Segoe UI, sans-serif; }
    .value { fill: #f4f7f8; font: 700 24px system-ui, -apple-system, Segoe UI, sans-serif; }
    .small { fill: #d7e0e4; font: 14px system-ui, -apple-system, Segoe UI, sans-serif; }
    .ready { fill: #47c27a; }
    .review { fill: #f2b84b; }
    .blocked { fill: #ef6a6a; }
    .muted { fill: #7f9098; font: 13px ui-monospace, SFMono-Regular, Menlo, monospace; }
  </style>
  <rect class="bg" width="960" height="540"/>
  <text x="48" y="64" class="title">Invoice Acceptance Evidence Gate</text>
  <text x="48" y="94" class="muted">Audit digest ${report.auditDigest} · synthetic data · as of ${report.asOf.slice(0, 10)}</text>
  <rect x="48" y="124" width="864" height="168" rx="8" class="panel"/>
  <text x="80" y="162" class="label">Ready to invoice</text>
  <rect x="250" y="143" width="${bar(ready)}" height="28" rx="4" class="ready"/>
  <text x="710" y="166" class="value">$${ready.toLocaleString()}</text>
  <text x="80" y="212" class="label">Needs review</text>
  <rect x="250" y="193" width="${bar(review)}" height="28" rx="4" class="review"/>
  <text x="710" y="216" class="value">$${review.toLocaleString()}</text>
  <text x="80" y="262" class="label">Blocked</text>
  <rect x="250" y="243" width="${bar(blocked)}" height="28" rx="4" class="blocked"/>
  <text x="710" y="266" class="value">$${blocked.toLocaleString()}</text>
  <rect x="48" y="314" width="864" height="150" rx="8" class="panel"/>
  <text x="48" y="496" class="muted">Gate output: finance can invoice approved acceptance packets and route blockers to owners before revenue leaks.</text>
  ${rows}
</svg>
`;

fs.writeFileSync(path.join(outputDir, "demo.svg"), svg);
fs.writeFileSync(path.join(outputDir, "demo.gif"), makeDemoGif({ ready, review, blocked }));

console.log(`Wrote ${path.relative(process.cwd(), path.join(outputDir, "demo-output.json"))}`);
console.log(`Wrote ${path.relative(process.cwd(), path.join(outputDir, "demo.svg"))}`);
console.log(`Wrote ${path.relative(process.cwd(), path.join(outputDir, "demo.gif"))}`);
console.log(`Ready: $${ready}; review: $${review}; blocked: $${blocked}; digest: ${report.auditDigest}`);

function makeDemoGif(values) {
  const width = 480;
  const height = 270;
  const palette = [
    [16, 20, 24],
    [23, 32, 38],
    [51, 66, 77],
    [71, 194, 122],
    [242, 184, 75],
    [239, 106, 106],
    [244, 247, 248],
    [127, 144, 152],
  ];
  while (palette.length < 256) palette.push([0, 0, 0]);

  const frames = [0.35, 0.7, 1].map((progress) => drawFrame(width, height, values, progress));
  const chunks = [
    Buffer.from("GIF89a", "ascii"),
    u16(width),
    u16(height),
    Buffer.from([0xf7, 0x00, 0x00]),
    Buffer.from(palette.flat()),
    Buffer.from([0x21, 0xff, 0x0b]),
    Buffer.from("NETSCAPE2.0", "ascii"),
    Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]),
  ];

  for (const frame of frames) {
    chunks.push(Buffer.from([0x21, 0xf9, 0x04, 0x04]), u16(60), Buffer.from([0x00, 0x00]));
    chunks.push(Buffer.from([0x2c]), u16(0), u16(0), u16(width), u16(height), Buffer.from([0x00, 0x08]));
    chunks.push(blocks(lzwLiteralEncode(frame)));
  }
  chunks.push(Buffer.from([0x3b]));
  return Buffer.concat(chunks);
}

function drawFrame(width, height, values, progress) {
  const pixels = Buffer.alloc(width * height, 0);
  rect(pixels, width, 24, 56, 432, 138, 1);
  rect(pixels, width, 25, 57, 430, 136, 1);
  const max = Math.max(values.ready, values.review, values.blocked, 1);
  const scale = (value) => Math.round((value / max) * 250 * progress);
  drawBar(pixels, width, 56, 88, scale(values.ready), 26, 3);
  drawBar(pixels, width, 56, 130, scale(values.review), 26, 4);
  drawBar(pixels, width, 56, 172, scale(values.blocked), 26, 5);
  rect(pixels, width, 332, 84, 88, 22, 6);
  rect(pixels, width, 332, 126, 88, 22, 6);
  rect(pixels, width, 332, 168, 88, 22, 6);
  rect(pixels, width, 24, 214, Math.round(432 * progress), 16, progress === 1 ? 5 : 2);
  rect(pixels, width, 24, 238, Math.round(310 * progress), 10, 7);
  return pixels;
}

function drawBar(pixels, width, x, y, w, h, color) {
  rect(pixels, width, x, y, 250, h, 2);
  rect(pixels, width, x, y, w, h, color);
}

function rect(pixels, width, x, y, w, h, color) {
  const maxY = Math.min(y + h, Math.floor(pixels.length / width));
  for (let yy = Math.max(0, y); yy < maxY; yy += 1) {
    const start = yy * width + Math.max(0, x);
    const end = yy * width + Math.min(width, x + w);
    pixels.fill(color, start, end);
  }
}

function lzwLiteralEncode(indices) {
  const clear = 256;
  const end = 257;
  const codes = [];
  for (let index = 0; index < indices.length; index += 100) {
    codes.push(clear);
    for (const value of indices.subarray(index, index + 100)) codes.push(value);
  }
  codes.push(end);

  const bytes = [];
  let bitBuffer = 0;
  let bitCount = 0;
  for (const code of codes) {
    bitBuffer |= code << bitCount;
    bitCount += 9;
    while (bitCount >= 8) {
      bytes.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  }
  if (bitCount > 0) bytes.push(bitBuffer & 0xff);
  return Buffer.from(bytes);
}

function blocks(data) {
  const out = [];
  for (let offset = 0; offset < data.length; offset += 255) {
    const chunk = data.subarray(offset, offset + 255);
    out.push(Buffer.from([chunk.length]), chunk);
  }
  out.push(Buffer.from([0x00]));
  return Buffer.concat(out);
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}
