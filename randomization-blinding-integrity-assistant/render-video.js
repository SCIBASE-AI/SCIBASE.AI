const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const {evaluateRandomizationBlindingIntegrity} = require('./index');
const {samplePacket} = require('./sample-data');

const REPORT_DIR = path.join(__dirname, 'reports');

function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const candidate = path.resolve(__dirname, '..', '..', '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  if (fs.existsSync(candidate)) return candidate;
  return 'ffmpeg';
}

function main() {
  fs.mkdirSync(REPORT_DIR, {recursive: true});
  const result = evaluateRandomizationBlindingIntegrity(samplePacket);
  const outPath = path.join(REPORT_DIR, 'demo.mp4');
  const ffmpeg = resolveFfmpeg();
  const scoreWidth = Math.max(24, Math.min(820, Math.round(result.readinessScore * 8.2)));
  const findingWidth = Math.max(24, Math.min(820, result.findings.length * 86));
  const actionWidth = Math.max(24, Math.min(820, result.requiredActions.length * 92));
  const filters = [
    'drawbox=x=52:y=52:w=1176:h=616:color=white@0.13:t=fill',
    'drawbox=x=76:y=76:w=1128:h=568:color=white@0.08:t=fill',
    'drawbox=x=110:y=168:w=820:h=44:color=white@0.28:t=fill',
    `drawbox=x=110:y=168:w=${scoreWidth}:h=44:color=0x2e7d32@1:t=fill`,
    'drawbox=x=110:y=286:w=820:h=44:color=white@0.28:t=fill',
    `drawbox=x=110:y=286:w=${findingWidth}:h=44:color=0xc2410c@1:t=fill`,
    'drawbox=x=110:y=404:w=820:h=44:color=white@0.28:t=fill',
    `drawbox=x=110:y=404:w=${actionWidth}:h=44:color=0x1565c0@1:t=fill`,
    'drawbox=x=984:y=168:w=140:h=44:color=0x2e7d32@1:t=fill',
    'drawbox=x=984:y=286:w=140:h=44:color=0xc2410c@1:t=fill',
    'drawbox=x=984:y=404:w=140:h=44:color=0x1565c0@1:t=fill',
    'drawbox=x=110:y=548:w=520:h=38:color=white@0.22:t=fill',
    'drawbox=x=110:y=548:w=420:h=38:color=0xf9ab00@1:t=fill',
  ].join(',');

  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=0x17324d:s=1280x720:d=4:r=25',
    '-vf', filters,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outPath,
  ];
  const resultProcess = spawnSync(ffmpeg, args, {stdio: 'inherit'});
  if (resultProcess.status !== 0) {
    throw new Error(`ffmpeg exited with ${resultProcess.status}`);
  }
  console.log(outPath);
}

if (require.main === module) {
  main();
}
