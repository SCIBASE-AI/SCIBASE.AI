const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const output = path.join(__dirname, 'reports', 'demo.mp4');
const gifOutput = path.join(__dirname, 'reports', 'demo.gif');

const WIDTH = 480;
const HEIGHT = 270;

function ensureReportsDir() {
  fs.mkdirSync(path.dirname(output), { recursive: true });
}

function writePpm(filePath, pixels) {
  const header = Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`);
  fs.writeFileSync(filePath, Buffer.concat([header, pixels]));
}

function rgb(hex) {
  const clean = hex.replace('#', '');
  return [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16));
}

function makeCanvas(color = '#ffffff') {
  const canvas = Buffer.alloc(WIDTH * HEIGHT * 3);
  const [r, g, b] = rgb(color);
  for (let i = 0; i < canvas.length; i += 3) {
    canvas[i] = r;
    canvas[i + 1] = g;
    canvas[i + 2] = b;
  }
  return canvas;
}

function rect(canvas, x, y, width, height, color) {
  const [r, g, b] = rgb(color);
  for (let yy = Math.max(0, y); yy < Math.min(HEIGHT, y + height); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(WIDTH, x + width); xx++) {
      const i = (yy * WIDTH + xx) * 3;
      canvas[i] = r;
      canvas[i + 1] = g;
      canvas[i + 2] = b;
    }
  }
}

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '01010', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
};

function text(canvas, value, x, y, scale, color) {
  let cursor = x;
  for (const char of value.toUpperCase()) {
    const glyph = FONT[char] || FONT[' '];
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] === '1') {
          rect(canvas, cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += 6 * scale;
  }
}

function frame(title, subtitle, bars) {
  const canvas = makeCanvas('#f8fafc');
  rect(canvas, 0, 0, WIDTH, 54, '#0f172a');
  text(canvas, title, 22, 18, 3, '#ffffff');
  text(canvas, subtitle, 24, 74, 2, '#334155');
  bars.forEach((bar, index) => {
    const y = 126 + index * 34;
    rect(canvas, 34, y, 320, 18, '#e2e8f0');
    rect(canvas, 34, y, Math.round(320 * bar.value), 18, bar.color);
    text(canvas, bar.label, 370, y + 2, 2, '#0f172a');
  });
  return canvas;
}

function renderFrames(dir) {
  const frames = [
    frame('AI REVIEW BINDER', 'EVIDENCE BEFORE RELEASE', [
      { label: 'HOLD', value: 0.9, color: '#dc2626' },
      { label: 'REVISE', value: 0.55, color: '#ca8a04' },
      { label: 'RELEASE', value: 0.2, color: '#16a34a' }
    ]),
    frame('EVIDENCE CHECK', 'NO HALLUCINATED REVIEW', [
      { label: 'MISSING', value: 0.86, color: '#dc2626' },
      { label: 'WEAK', value: 0.56, color: '#ca8a04' },
      { label: 'STRONG', value: 0.24, color: '#16a34a' }
    ]),
    frame('SEVERITY PRIVACY', 'CALIBRATE AND REDACT', [
      { label: 'SEVERE', value: 0.72, color: '#dc2626' },
      { label: 'PRIVATE', value: 0.44, color: '#ca8a04' },
      { label: 'SAFE', value: 0.22, color: '#16a34a' }
    ]),
    frame('SCIBASE ISSUE 16', 'HOLD REVISE RELEASE', [
      { label: 'JSON', value: 0.84, color: '#0ea5e9' },
      { label: 'MARKDOWN', value: 0.72, color: '#6366f1' },
      { label: 'SVG MP4', value: 0.64, color: '#10b981' }
    ])
  ];

  return frames.map((canvas, index) => {
    const filePath = path.join(dir, `frame-${String(index + 1).padStart(2, '0')}.ppm`);
    writePpm(filePath, canvas);
    return filePath;
  });
}

function renderVideo(frames) {
  const input = path.join(path.dirname(frames[0]), 'frame-%02d.ppm');
  const ffmpeg = spawnSync('ffmpeg', ['-y', '-framerate', '1', '-i', input, '-vf', 'scale=960:540:flags=neighbor,fps=24,format=yuv420p', '-movflags', '+faststart', output], {
    stdio: 'inherit'
  });
  if (ffmpeg.status === 0) {
    console.log(`Rendered ${output}`);
    return;
  }

  const magick = spawnSync('magick', ['-delay', '140', '-loop', '0', ...frames, gifOutput], {
    stdio: 'inherit'
  });
  if (magick.status !== 0) {
    throw new Error('Unable to render MP4 with ffmpeg or GIF with ImageMagick');
  }
  console.log(`Rendered ${gifOutput}`);
}

ensureReportsDir();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'peer-review-evidence-binder-'));
try {
  renderVideo(renderFrames(tmp));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
