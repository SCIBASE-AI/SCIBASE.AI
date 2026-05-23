const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, {recursive: true});

const candidates = [
  process.env.FFMPEG_PATH,
  path.join(__dirname, '..', '..', '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
  path.join(__dirname, '..', '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
  path.join(__dirname, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
  'ffmpeg',
].filter(Boolean);

const ffmpeg = candidates.find((candidate) => candidate === 'ffmpeg' || fs.existsSync(candidate));
if (!ffmpeg) {
  throw new Error('ffmpeg not found. Set FFMPEG_PATH or install ffmpeg-static.');
}

const output = path.join(reportsDir, 'demo.mp4');
const vf = [
  'drawbox=x=70:y=70:w=1140:h=580:color=white@0.95:t=fill',
  'drawbox=x=120:y=130:w=460:h=360:color=0xb42318@0.88:t=fill',
  'drawbox=x=700:y=130:w=460:h=360:color=0x147d3f@0.88:t=fill',
  'drawbox=x=165:y=535:w=950:h=45:color=0x374151@0.95:t=fill',
  'drawbox=x=165:y=535:w=570:h=45:color=0xf59e0b@0.95:t=fill',
  'drawbox=x=120:y=510:w=460:h=26:color=0xfef3c7@0.95:t=fill',
  'drawbox=x=700:y=510:w=460:h=26:color=0xd1fae5@0.95:t=fill',
].join(',');

const result = spawnSync(ffmpeg, [
  '-y',
  '-loglevel', 'error',
  '-f', 'lavfi',
  '-i', 'color=c=0x1f2933:s=1280x720:d=12:r=15',
  '-vf', vf,
  '-pix_fmt', 'yuv420p',
  '-c:v', 'libx264',
  output,
], {stdio: 'inherit'});

if (result.status !== 0) {
  throw new Error(`ffmpeg failed with status ${result.status}: ${result.error ? result.error.message : 'see ffmpeg output'}`);
}

console.log(output);
