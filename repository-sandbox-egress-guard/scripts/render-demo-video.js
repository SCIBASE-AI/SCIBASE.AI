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
  `drawtext=fontfile=${font}:text='Repository Sandbox Egress Guard':x=64:y=56:fontsize=42:fontcolor=black`,
  `drawtext=fontfile=${font}:text='Reproducibility run containment before merge or DOI release':x=64:y=122:fontsize=25:fontcolor=0x34405a`,
  `drawtext=fontfile=${font}:text='Synthetic execution plans analyzed 4':x=64:y=214:fontsize=34:fontcolor=black`,
  `drawtext=fontfile=${font}:text='HOLD 2    REVIEW 1    RELEASE 1':x=64:y=274:fontsize=40:fontcolor=0x225c9c`,
  `drawtext=fontfile=${font}:text='Detects open egress secrets privileged mode unsafe mounts':x=64:y=366:fontsize=26:fontcolor=0x34405a`,
  `drawtext=fontfile=${font}:text='Freezes protected merge and public release until sandbox risks clear':x=64:y=428:fontsize=26:fontcolor=0x34405a`,
  `drawtext=fontfile=${font}:text='Synthetic generated slate only no desktop capture or private data':x=64:y=492:fontsize=26:fontcolor=0x34405a`
].join(",");

if (!fs.existsSync(ffmpeg)) {
  throw new Error(`ffmpeg binary not found at ${ffmpeg}`);
}

const result = spawnSync(ffmpeg, [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0xf7fbff:s=1280x720:d=8:r=30",
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
