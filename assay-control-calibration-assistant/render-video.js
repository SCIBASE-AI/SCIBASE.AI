const path = require('node:path');
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');

function resolveFfmpegPath() {
  if (process.env.FFMPEG_PATH) {
    return process.env.FFMPEG_PATH;
  }

  try {
    return require('ffmpeg-static');
  } catch (error) {
    throw new Error('Set FFMPEG_PATH or install ffmpeg-static to render reports/demo.mp4');
  }
}

const outputPath = path.join(__dirname, 'reports', 'demo.mp4');
const windowsArial = 'C:/Windows/Fonts/arial.ttf';
const font = fs.existsSync(windowsArial) ? 'fontfile=C\\\\:/Windows/Fonts/arial.ttf' : '';
function drawText(options) {
  return `drawtext=${[font, ...options].filter(Boolean).join(':')}`;
}

const filter = [
  drawText(['fontcolor=white', 'fontsize=46', 'text=Assay Control Calibration Assistant', 'x=60', 'y=90']),
  drawText(['fontcolor=0xBAE6FD', 'fontsize=28', 'text=Synthetic reviewer packet for controls calibration QC', 'x=60', 'y=150']),
  drawText(['fontcolor=0xD1FAE5', 'fontsize=64', 'text=Approved 1', 'x=90', 'y=280']),
  drawText(['fontcolor=0xFEF3C7', 'fontsize=64', 'text=Response 2', 'x=460', 'y=280']),
  drawText(['fontcolor=0xFEE2E2', 'fontsize=64', 'text=Hold 1', 'x=880', 'y=280']),
  drawText(['fontcolor=white', 'fontsize=28', 'text=Findings 7 Missing controls 3 Calibration issues 2 QC issues 1', 'x=60', 'y=520']),
].join(',');

const ffmpegPath = resolveFfmpegPath();
const result = spawnSync(ffmpegPath, [
  '-y',
  '-v',
  'error',
  '-f',
  'lavfi',
  '-i',
  'color=c=0f172a:s=1280x720:d=4',
  '-vf',
  filter,
  '-t',
  '4',
  '-pix_fmt',
  'yuv420p',
  '-c:v',
  'libx264',
  '-movflags',
  '+faststart',
  outputPath,
], {stdio: 'inherit'});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`Wrote ${outputPath}`);
