"use strict";

const fs = require("node:fs");
const path = require("node:path");

const width = 480;
const height = 270;
const colors = [
  [246, 248, 251],
  [255, 255, 255],
  [21, 93, 72],
  [151, 93, 12],
  [174, 50, 45],
  [205, 214, 224],
  [79, 91, 110],
  [28, 35, 48]
];

function u16(value) {
  return Buffer.from([value & 255, (value >> 8) & 255]);
}

function subBlocks(data) {
  const parts = [];
  for (let index = 0; index < data.length; index += 255) {
    const chunk = data.subarray(index, index + 255);
    parts.push(Buffer.from([chunk.length]), chunk);
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

function rect(pixels, x, y, w, h, color) {
  for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy += 1) {
    for (let xx = Math.max(0, x); xx < Math.min(width, x + w); xx += 1) {
      pixels[yy * width + xx] = color;
    }
  }
}

function digits(pixels, x, y, value, color) {
  const glyphs = {
    0: ["111", "101", "101", "101", "111"],
    1: ["010", "110", "010", "010", "111"],
    2: ["111", "001", "111", "100", "111"],
    3: ["111", "001", "111", "001", "111"],
    4: ["101", "101", "111", "001", "001"],
    5: ["111", "100", "111", "001", "111"],
    6: ["111", "100", "111", "101", "111"],
    7: ["111", "001", "010", "010", "010"],
    8: ["111", "101", "111", "101", "111"],
    9: ["111", "101", "111", "001", "111"]
  };

  String(value)
    .split("")
    .forEach((digit, index) => {
      glyphs[digit].forEach((row, rowIndex) => {
        row.split("").forEach((bit, colIndex) => {
          if (bit === "1") {
            rect(pixels, x + index * 18 + colIndex * 5, y + rowIndex * 5, 4, 4, color);
          }
        });
      });
    });
}

function bar(pixels, x, y, value, color) {
  rect(pixels, x, y, 260, 18, 5);
  rect(pixels, x + 2, y + 2, Math.round(256 * value), 14, color);
}

function frame(step) {
  const pixels = new Uint8Array(width * height).fill(0);
  rect(pixels, 24, 20, 432, 230, 1);
  rect(pixels, 44, 46, 312, 10, 7);
  rect(pixels, 44, 64, 224, 5, 6);

  [
    [44, 90, 2, "1"],
    [184, 90, 3, "1"],
    [324, 90, 4, "1"]
  ].forEach(([x, y, color, label], index) => {
    rect(pixels, x, y, 108, 46, step >= index ? color : 5);
    rect(pixels, x + 4, y + 4, 100, 38, step >= index ? 1 : 0);
    digits(pixels, x + 42, y + 12, label, color);
  });

  rect(pixels, 44, 158, 76, 10, 7);
  rect(pixels, 44, 186, 76, 10, 7);
  rect(pixels, 44, 214, 76, 10, 7);
  bar(pixels, 136, 158, step >= 0 ? 0.02 : 0.2, 2);
  bar(pixels, 136, 186, step >= 1 ? 0.14 : 0.2, 3);
  bar(pixels, 136, 214, step >= 2 ? 1.0 : 0.2, 4);
  digits(pixels, 412, 154, step >= 0 ? "1" : "0", step >= 0 ? 2 : 6);
  digits(pixels, 412, 182, step >= 1 ? "15" : "0", step >= 1 ? 3 : 6);
  digits(pixels, 412, 210, step >= 2 ? "135" : "0", step >= 2 ? 4 : 6);
  return pixels;
}

function lzwPlain(indices) {
  const minCodeSize = 3;
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  const codes = [clearCode];

  for (const index of indices) {
    codes.push(index, clearCode);
  }

  codes.push(endCode);
  return { minCodeSize, data: packCodes(codes, minCodeSize + 1) };
}

function packCodes(codes, codeSize) {
  const bytes = [];
  let bitBuffer = 0;
  let bitCount = 0;

  for (const code of codes) {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      bytes.push(bitBuffer & 255);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  }

  if (bitCount > 0) {
    bytes.push(bitBuffer & 255);
  }

  return Buffer.from(bytes);
}

function buildGif() {
  const parts = [Buffer.from("GIF89a", "ascii"), u16(width), u16(height), Buffer.from([0b11100010, 0, 0])];
  for (const color of colors) {
    parts.push(Buffer.from(color));
  }

  parts.push(
    Buffer.from([0x21, 0xff, 0x0b]),
    Buffer.from("NETSCAPE2.0", "ascii"),
    Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00])
  );

  for (let step = 0; step < 3; step += 1) {
    const encoded = lzwPlain(frame(step));
    parts.push(
      Buffer.from([0x21, 0xf9, 0x04, 0x04]),
      u16(step === 2 ? 140 : 80),
      Buffer.from([0, 0]),
      Buffer.from([0x2c]),
      u16(0),
      u16(0),
      u16(width),
      u16(height),
      Buffer.from([0]),
      Buffer.from([encoded.minCodeSize]),
      subBlocks(encoded.data)
    );
  }

  parts.push(Buffer.from([0x3b]));
  return Buffer.concat(parts);
}

function buildSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Collaborative editor lock checkpoint demo">
  <rect width="960" height="540" fill="#f6f8fb"/>
  <rect x="64" y="56" width="832" height="428" rx="18" fill="#ffffff" stroke="#cdd6e0"/>
  <text x="96" y="116" fill="#1c2330" font-family="Arial, sans-serif" font-size="32" font-weight="700">Editor Lock + Checkpoint Recovery</text>
  <text x="96" y="158" fill="#4f5b6e" font-family="Arial, sans-serif" font-size="20">Stale locks, autosave gaps, restore points, blocking work</text>
  <g font-family="Arial, sans-serif" font-size="24" font-weight="700">
    <rect x="96" y="214" width="210" height="96" rx="12" fill="#155d48"/>
    <text x="126" y="272" fill="#ffffff">1 ready</text>
    <rect x="374" y="214" width="210" height="96" rx="12" fill="#975d0c"/>
    <text x="404" y="272" fill="#ffffff">1 review</text>
    <rect x="652" y="214" width="210" height="96" rx="12" fill="#ae322d"/>
    <text x="682" y="272" fill="#ffffff">1 blocked</text>
  </g>
  <g font-family="Arial, sans-serif" font-size="20">
    <text x="96" y="372" fill="#1c2330">Top blocker: stale hard lock with edits from a non-owner</text>
    <text x="96" y="410" fill="#1c2330">Restore plan uses hashed checkpoints and named versions</text>
  </g>
</svg>
`;
}

const docsDir = path.join(__dirname, "..", "docs");
fs.mkdirSync(docsDir, { recursive: true });
const gifPath = path.join(docsDir, "demo.gif");
const svgPath = path.join(docsDir, "demo.svg");
fs.writeFileSync(gifPath, buildGif());
fs.writeFileSync(svgPath, buildSvg());
console.log(`Wrote ${path.relative(process.cwd(), gifPath)} and ${path.relative(process.cwd(), svgPath)}`);
