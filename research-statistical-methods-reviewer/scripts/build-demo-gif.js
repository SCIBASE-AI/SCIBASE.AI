"use strict";

const fs = require("node:fs");
const path = require("node:path");

const width = 480;
const height = 270;
const colors = [
  [247, 249, 252],
  [255, 255, 255],
  [21, 101, 72],
  [159, 98, 0],
  [177, 45, 40],
  [204, 213, 224],
  [80, 92, 111],
  [28, 34, 48]
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
  rect(pixels, 44, 44, 310, 10, 7);
  rect(pixels, 44, 62, 240, 5, 6);

  [
    [44, 88, 2, "1"],
    [184, 88, 3, "1"],
    [324, 88, 4, "1"]
  ].forEach(([x, y, color, label], index) => {
    rect(pixels, x, y, 108, 46, step >= index ? color : 5);
    rect(pixels, x + 4, y + 4, 100, 38, step >= index ? 1 : 0);
    digits(pixels, x + 42, y + 12, label, color);
  });

  rect(pixels, 44, 156, 72, 10, 7);
  rect(pixels, 44, 184, 72, 10, 7);
  rect(pixels, 44, 212, 72, 10, 7);
  bar(pixels, 132, 156, step >= 0 ? 0.86 : 0.2, 2);
  bar(pixels, 132, 184, step >= 1 ? 0.64 : 0.2, 3);
  bar(pixels, 132, 212, step >= 2 ? 0.24 : 0.2, 4);
  digits(pixels, 412, 152, step >= 0 ? "86" : "0", step >= 0 ? 2 : 6);
  digits(pixels, 412, 180, step >= 1 ? "64" : "0", step >= 1 ? 3 : 6);
  digits(pixels, 412, 208, step >= 2 ? "24" : "0", step >= 2 ? 4 : 6);
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Statistical review assistant demo">
  <rect width="960" height="540" fill="#f7f9fc"/>
  <rect x="64" y="56" width="832" height="428" rx="18" fill="#ffffff" stroke="#ccd5e0"/>
  <text x="96" y="116" fill="#1c2230" font-family="Arial, sans-serif" font-size="32" font-weight="700">Statistical Methods Review Assistant</text>
  <text x="96" y="158" fill="#505c6f" font-family="Arial, sans-serif" font-size="20">Claim mapping, test choice, power, multiplicity, reproducibility</text>
  <g font-family="Arial, sans-serif" font-size="24" font-weight="700">
    <rect x="96" y="214" width="210" height="96" rx="12" fill="#156548"/>
    <text x="126" y="272" fill="#ffffff">1 ready</text>
    <rect x="374" y="214" width="210" height="96" rx="12" fill="#9f6200"/>
    <text x="404" y="272" fill="#ffffff">1 review</text>
    <rect x="652" y="214" width="210" height="96" rx="12" fill="#b12d28"/>
    <text x="682" y="272" fill="#ffffff">1 blocked</text>
  </g>
  <g font-family="Arial, sans-serif" font-size="20">
    <text x="96" y="372" fill="#1c2230">Top blocker: repeated-measures data analyzed with a two-group t-test</text>
    <text x="96" y="410" fill="#1c2230">Signed review packets include deterministic HMAC audit evidence</text>
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
