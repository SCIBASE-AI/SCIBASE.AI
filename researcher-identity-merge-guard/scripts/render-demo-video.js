"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const ffmpeg = path.resolve(
  root,
  "..",
  "..",
  "tool_downloads",
  "video_tools",
  "node_modules",
  "ffmpeg-static",
  "ffmpeg.exe"
);
const outDir = path.join(root, "reports");
const out = path.join(outDir, "demo.mp4");
const font = "C\\:/Windows/Fonts/arial.ttf";

fs.mkdirSync(outDir, { recursive: true });

const draw = [
  `drawtext=fontfile=${font}:text='Researcher Identity Merge Guard':x=64:y=56:fontsize=42:fontcolor=black`,
  `drawtext=fontfile=${font}:text='Community reputation profile consolidation gate':x=64:y=122:fontsize=25:fontcolor=0x374151`,
  `drawtext=fontfile=${font}:text='Synthetic merge packets analyzed 4':x=64:y=214:fontsize=34:fontcolor=black`,
  `drawtext=fontfile=${font}:text='HOLD 2    REVIEW 1    APPROVE 1':x=64:y=274:fontsize=40:fontcolor=0x2f855a`,
  `drawtext=fontfile=${font}:text='Checks ORCID GitHub email consent privacy and credit spikes':x=64:y=366:fontsize=26:fontcolor=0x374151`,
  `drawtext=fontfile=${font}:text='Freezes reputation transfer until audit evidence is safe':x=64:y=428:fontsize=26:fontcolor=0x374151`,
  `drawtext=fontfile=${font}:text='Synthetic generated slate only no desktop capture or private data':x=64:y=492:fontsize=26:fontcolor=0x374151`
].join(",");

if (!fs.existsSync(ffmpeg)) {
  throw new Error(`ffmpeg binary not found at ${ffmpeg}`);
}

const result = spawnSync(ffmpeg, [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0xfbfaf6:s=1280x720:d=8:r=30",
  "-vf",
  draw,
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  out
], { encoding: "utf8" });

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status || 1);
}

console.log(JSON.stringify({ out, bytes: fs.statSync(out).size }, null, 2));
