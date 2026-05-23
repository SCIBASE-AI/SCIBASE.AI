const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const {evaluatePaymentAuthorizationFreshness} = require('./index');
const {sampleBatch} = require('./sample-data');

const REPORT_DIR = path.join(__dirname, 'reports');

function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const candidate = path.resolve(__dirname, '..', '..', '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  if (fs.existsSync(candidate)) return candidate;
  return 'ffmpeg';
}

function main() {
  fs.mkdirSync(REPORT_DIR, {recursive: true});
  const result = evaluatePaymentAuthorizationFreshness(sampleBatch);
  const outPath = path.join(REPORT_DIR, 'demo.mp4');
  const ffmpeg = resolveFfmpeg();
  const scoreWidth = Math.max(24, Math.min(820, Math.round(result.authorizationScore * 8.2)));
  const findingWidth = Math.max(24, Math.min(820, result.findings.length * 64));
  const actionWidth = Math.max(24, Math.min(820, result.requiredActions.length * 64));
  const filters = [
    'drawbox=x=52:y=52:w=1176:h=616:color=white@0.13:t=fill',
    'drawbox=x=76:y=76:w=1128:h=568:color=white@0.08:t=fill',
    'drawbox=x=110:y=168:w=820:h=44:color=white@0.28:t=fill',
    `drawbox=x=110:y=168:w=${scoreWidth}:h=44:color=0x2f855a@1:t=fill`,
    'drawbox=x=110:y=286:w=820:h=44:color=white@0.28:t=fill',
    `drawbox=x=110:y=286:w=${findingWidth}:h=44:color=0xb45309@1:t=fill`,
    'drawbox=x=110:y=404:w=820:h=44:color=white@0.28:t=fill',
    `drawbox=x=110:y=404:w=${actionWidth}:h=44:color=0x1d4ed8@1:t=fill`,
    'drawbox=x=984:y=168:w=140:h=44:color=0x2f855a@1:t=fill',
    'drawbox=x=984:y=286:w=140:h=44:color=0xb45309@1:t=fill',
    'drawbox=x=984:y=404:w=140:h=44:color=0x1d4ed8@1:t=fill',
    'drawbox=x=110:y=548:w=620:h=38:color=white@0.22:t=fill',
    'drawbox=x=110:y=548:w=430:h=38:color=0xf9ab00@1:t=fill',
  ].join(',');

  const resultProcess = spawnSync(ffmpeg, [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=0x1d2330:s=1280x720:d=4:r=25',
    '-vf', filters,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outPath,
  ], {stdio: 'inherit'});
  if (resultProcess.status !== 0) {
    throw new Error(`ffmpeg exited with ${resultProcess.status}`);
  }
  console.log(outPath);
}

if (require.main === module) {
  main();
}
