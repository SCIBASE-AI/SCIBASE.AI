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
  `drawtext=fontfile=${font}:text='Collaborative Ethics and Consent':x=64:y=56:fontsize=42:fontcolor=black`,
  `drawtext=fontfile=${font}:text='Real-time editor export guard for human-subjects manuscripts':x=64:y=120:fontsize=25:fontcolor=0x34413b`,
  `drawtext=fontfile=${font}:text='Synthetic editor packets analyzed 4':x=64:y=210:fontsize=34:fontcolor=black`,
  `drawtext=fontfile=${font}:text='RELEASE 1    REVIEW 1    HOLD 2':x=64:y=268:fontsize=38:fontcolor=0x245fd6`,
  `drawtext=fontfile=${font}:text='Checks approval IDs consent scope translations locked ethics edits':x=64:y=358:fontsize=26:fontcolor=0x34413b`,
  `drawtext=fontfile=${font}:text='Flags participant identifiers private comments and expired approvals':x=64:y=422:fontsize=26:fontcolor=0x34413b`,
  `drawtext=fontfile=${font}:text='Synthetic generated slate only no desktop capture or private data':x=64:y=486:fontsize=26:fontcolor=0x34413b`
].join(",");

if (!fs.existsSync(ffmpeg)) {
  throw new Error(`ffmpeg binary not found at ${ffmpeg}`);
}

const result = spawnSync(ffmpeg, [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0xf9faf8:s=1280x720:d=8:r=30",
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
