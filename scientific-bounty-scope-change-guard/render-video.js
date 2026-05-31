const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const output = path.join(__dirname, 'reports', 'demo.mp4');
const gifOutput = path.join(__dirname, 'reports', 'demo.gif');
const reportsDir = path.join(__dirname, 'reports');

function main() {
  fs.mkdirSync(reportsDir, { recursive: true });
  const ffmpegReady = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
  const frames = writeFrames();

  try {
    if (ffmpegReady) {
      const result = spawnSync(
        'ffmpeg',
        [
          '-y',
          '-framerate',
          '1',
          '-i',
          path.join(reportsDir, 'frame-%02d.ppm'),
          '-vf',
          'scale=960:540:flags=neighbor,format=yuv420p',
          '-movflags',
          '+faststart',
          '-r',
          '24',
          output
        ],
        { stdio: 'inherit' }
      );

      if (result.status === 0) {
        console.log(`Rendered ${output}`);
        return;
      }
    }

    console.log(ffmpegReady ? 'ffmpeg render failed; trying ImageMagick GIF fallback.' : 'ffmpeg is unavailable; trying ImageMagick GIF fallback.');
    const magick = spawnSync('magick', ['-delay', '140', '-loop', '0', ...frames, gifOutput], {
      stdio: 'inherit'
    });

    if (magick.status !== 0) {
      process.exit(magick.status || 1);
    }

    console.log(`Rendered ${gifOutput}`);
  } finally {
    cleanupFrames(frames);
  }
}

function writeFrames() {
  return [
    {
      name: 'frame-01.ppm',
      title: 'SCOPE GUARD',
      subtitle: 'FREEZE BASELINE',
      accent: '#38bdf8'
    },
    {
      name: 'frame-02.ppm',
      title: 'RUBRIC SHIFT',
      subtitle: 'PRIZE ELIGIBILITY',
      accent: '#f97316'
    },
    {
      name: 'frame-03.ppm',
      title: 'NOTICE TEAMS',
      subtitle: 'CONSENT EXTEND',
      accent: '#22c55e'
    },
    {
      name: 'frame-04.ppm',
      title: 'HOLD REVIEW',
      subtitle: 'ALLOW SAFE COPY',
      accent: '#ef4444'
    }
  ].map((frame) => {
    const file = path.join(reportsDir, frame.name);
    fs.writeFileSync(file, ppmFrame(frame.title, frame.subtitle, frame.accent));
    return file;
  });
}

function cleanupFrames(frames) {
  for (const frame of frames) {
    if (fs.existsSync(frame)) {
      fs.unlinkSync(frame);
    }
  }
}

function ppmFrame(title, subtitle, accent) {
  const width = 480;
  const height = 270;
  const pixels = Buffer.alloc(width * height * 3);
  fill(pixels, width, height, hex('#0f172a'));
  rect(pixels, width, height, 24, 28, 10, 196, hex(accent));
  rect(pixels, width, height, 56, 142, 360, 54, hex('#1e293b'));
  rect(pixels, width, height, 56, 210, 250, 10, hex(accent));
  drawText(pixels, width, height, title, 56, 58, 6, hex('#f8fafc'));
  drawText(pixels, width, height, subtitle, 58, 110, 3, hex('#cbd5e1'));
  drawText(pixels, width, height, 'SCIBASE ISSUE 18', 78, 160, 3, hex('#f8fafc'));
  drawText(pixels, width, height, 'SYNTHETIC DEMO', 58, 236, 2, hex('#94a3b8'));
  return Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), pixels]);
}

function fill(pixels, width, height, color) {
  rect(pixels, width, height, 0, 0, width, height, color);
}

function rect(pixels, width, height, x, y, w, h, color) {
  for (let row = Math.max(0, y); row < Math.min(height, y + h); row += 1) {
    for (let col = Math.max(0, x); col < Math.min(width, x + w); col += 1) {
      const offset = (row * width + col) * 3;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
    }
  }
}

function drawText(pixels, width, height, text, x, y, scale, color) {
  let cursor = x;
  for (const char of text.toUpperCase()) {
    if (char === ' ') {
      cursor += 4 * scale;
      continue;
    }
    const glyph = FONT[char] || FONT['?'];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] === '1') {
          rect(pixels, width, height, cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += 6 * scale;
  }
}

function hex(value) {
  const clean = value.replace('#', '');
  return [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16));
}

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '?': ['11110', '00001', '00010', '00100', '00100', '00000', '00100']
};

main();
