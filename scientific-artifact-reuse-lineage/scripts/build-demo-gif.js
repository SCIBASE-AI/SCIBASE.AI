import { writeFile } from "node:fs/promises";

const width = 480;
const height = 270;
const palette = [
  [15, 23, 42],
  [17, 24, 39],
  [51, 65, 85],
  [248, 250, 252],
  [148, 163, 184],
  [34, 211, 238],
  [96, 165, 250],
  [74, 222, 128],
  [192, 132, 252],
  [252, 165, 165],
  [22, 78, 99],
  [30, 58, 138],
  [20, 83, 45],
  [88, 28, 135],
  [127, 29, 29],
  [129, 140, 248]
];

function drawFrame(title, cards, showEdges, showActions) {
  const pixels = new Uint8Array(width * height).fill(0);
  rect(pixels, 20, 20, width - 40, height - 40, 1);
  strokeRect(pixels, 20, 20, width - 40, height - 40, 2);
  text(pixels, "ARTIFACT REUSE LINEAGE", 40, 42, 3, 2);
  text(pixels, title, 40, 66, 4, 1);

  if (showEdges) {
    line(pixels, 130, 112, 194, 138, 5);
    line(pixels, 136, 182, 194, 154, 6);
    line(pixels, 284, 146, 348, 146, 7);
    text(pixels, "0.91", 140, 104, 5, 1);
    text(pixels, "0.89", 142, 184, 6, 1);
    text(pixels, "0.82", 300, 134, 7, 1);
  }

  for (const [label, x, y, fill, accent] of cards) {
    rect(pixels, x, y, 92, 44, fill);
    strokeRect(pixels, x, y, 92, 44, accent);
    text(pixels, label, x + 10, y + 16, 3, 1);
  }

  if (showActions) {
    rect(pixels, 44, 214, 180, 26, 15);
    rect(pixels, 292, 214, 144, 26, 14);
    text(pixels, "TRUSTED PATH", 56, 223, 3, 1);
    text(pixels, "REVIEW QUEUE", 304, 223, 3, 1);
  }

  return pixels;
}

function encodeGif(framePixels, frameWidth, frameHeight, colors) {
  const bytes = [];
  pushAscii(bytes, "GIF89a");
  pushWord(bytes, frameWidth);
  pushWord(bytes, frameHeight);
  bytes.push(0xf3, 0x00, 0x00);

  for (let i = 0; i < 16; i += 1) {
    const color = colors[i] || [0, 0, 0];
    bytes.push(color[0], color[1], color[2]);
  }

  bytes.push(0x21, 0xff, 0x0b);
  pushAscii(bytes, "NETSCAPE2.0");
  bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);

  for (const pixels of framePixels) {
    bytes.push(0x21, 0xf9, 0x04, 0x04);
    pushWord(bytes, 90);
    bytes.push(0x00, 0x00);
    bytes.push(0x2c);
    pushWord(bytes, 0);
    pushWord(bytes, 0);
    pushWord(bytes, frameWidth);
    pushWord(bytes, frameHeight);
    bytes.push(0x00);
    bytes.push(0x04);
    const compressed = lzwEncode(pixels, 4);
    for (let i = 0; i < compressed.length; i += 255) {
      const block = compressed.slice(i, i + 255);
      bytes.push(block.length, ...block);
    }
    bytes.push(0x00);
  }

  bytes.push(0x3b);
  return Buffer.from(bytes);
}

function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let dictionary = initialDictionary(clearCode);
  const output = [];
  let bitBuffer = 0;
  let bitCount = 0;

  const writeCode = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  const reset = () => {
    dictionary = initialDictionary(clearCode);
    codeSize = minCodeSize + 1;
    nextCode = endCode + 1;
  };

  writeCode(clearCode);
  let phrase = String.fromCharCode(indices[0]);

  for (let i = 1; i < indices.length; i += 1) {
    const char = String.fromCharCode(indices[i]);
    const combined = phrase + char;

    if (dictionary.has(combined)) {
      phrase = combined;
    } else {
      writeCode(dictionary.get(phrase));
      if (nextCode < 4096) {
        dictionary.set(combined, nextCode);
        nextCode += 1;
        if (nextCode === 1 << codeSize && codeSize < 12) codeSize += 1;
      } else {
        writeCode(clearCode);
        reset();
      }
      phrase = char;
    }
  }

  writeCode(dictionary.get(phrase));
  writeCode(endCode);
  if (bitCount > 0) output.push(bitBuffer & 0xff);
  return output;
}

function initialDictionary(size) {
  const dictionary = new Map();
  for (let i = 0; i < size; i += 1) {
    dictionary.set(String.fromCharCode(i), i);
  }
  return dictionary;
}

function rect(pixels, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      set(pixels, xx, yy, color);
    }
  }
}

function strokeRect(pixels, x, y, w, h, color) {
  for (let xx = x; xx < x + w; xx += 1) {
    set(pixels, xx, y, color);
    set(pixels, xx, y + h - 1, color);
  }
  for (let yy = y; yy < y + h; yy += 1) {
    set(pixels, x, yy, color);
    set(pixels, x + w - 1, yy, color);
  }
}

function line(pixels, x0, y0, x1, y1, color) {
  let dx = Math.abs(x1 - x0);
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  let sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    rect(pixels, x0 - 1, y0 - 1, 3, 3, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function text(pixels, value, x, y, color, scale = 1) {
  let cursor = x;
  for (const char of value.toUpperCase()) {
    const glyph = FONT[char] || FONT[" "];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] === "1") {
          rect(pixels, cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += 6 * scale;
  }
}

function set(pixels, x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  pixels[y * width + x] = color;
}

function pushAscii(bytes, value) {
  for (let i = 0; i < value.length; i += 1) bytes.push(value.charCodeAt(i));
}

function pushWord(bytes, value) {
  bytes.push(value & 0xff, (value >> 8) & 0xff);
}

const FONT = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "11100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"]
};

const frames = [
  drawFrame("LINK ARTIFACTS", [
    ["DATASET", 44, 88, 10, 5],
    ["NOTEBOOK", 44, 158, 11, 6],
    ["PROJECT", 194, 122, 12, 7],
    ["PAPER", 348, 122, 13, 8]
  ], false, false),
  drawFrame("SCORE EVIDENCE", [
    ["DATASET", 44, 88, 10, 5],
    ["NOTEBOOK", 44, 158, 11, 6],
    ["PROJECT", 194, 122, 12, 7],
    ["PAPER", 348, 122, 13, 8]
  ], true, false),
  drawFrame("RECOMMEND AND REVIEW", [
    ["RECOMMEND", 44, 192, 15, 3],
    ["CURATOR", 292, 192, 14, 3],
    ["PROJECT", 194, 96, 12, 7],
    ["PAPER", 348, 96, 13, 8]
  ], true, true)
];

await writeFile(new URL("../docs/demo.gif", import.meta.url), encodeGif(frames, width, height, palette));
console.log("Wrote docs/demo.gif");
