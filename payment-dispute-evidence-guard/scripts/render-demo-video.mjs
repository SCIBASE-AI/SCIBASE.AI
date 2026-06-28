import { access, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const artifactDir = join(root, 'artifacts');
const svgPath = join(artifactDir, 'dispute-review-demo.svg');
const pngPath = join(artifactDir, 'dispute-review-demo.png');
const videoPath = join(artifactDir, 'dispute-review-demo.webm');
const fontCandidates = [
  process.env.DEMO_FONT,
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
].filter(Boolean);

await mkdir(artifactDir, { recursive: true });
await access(svgPath).catch(() => {
  throw new Error('Run `npm run demo` before `npm run demo:video`.');
});

const fontArgs = await findFont();
await run('magick', [...fontArgs, svgPath, pngPath]);
await run('ffmpeg', [
  '-y',
  '-loop',
  '1',
  '-t',
  '5',
  '-i',
  pngPath,
  '-c:v',
  'libvpx-vp9',
  '-pix_fmt',
  'yuv420p',
  videoPath,
]);

console.log(`Generated demo video: ${videoPath}`);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function findFont() {
  for (const candidate of fontCandidates) {
    try {
      await access(candidate);
      return ['-font', candidate];
    } catch {
      // Try the next platform-specific font path.
    }
  }
  return [];
}
