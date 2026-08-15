"use strict";

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
const out = path.join(root, "artifacts", "demo.mp4");
const font = "C\\:/Windows/Fonts/arial.ttf";

const draw = [
  `drawtext=fontfile=${font}:text='Causal Claim Validity Guard':x=64:y=56:fontsize=46:fontcolor=black`,
  `drawtext=fontfile=${font}:text='AI peer-review gate for causal overclaiming':x=64:y=122:fontsize=25:fontcolor=0x34413b`,
  `drawtext=fontfile=${font}:text='Synthetic packets analyzed 4':x=64:y=212:fontsize=34:fontcolor=black`,
  `drawtext=fontfile=${font}:text='RELEASE 2    REVISE 1    HOLD 1':x=64:y=270:fontsize=38:fontcolor=0x245fd6`,
  `drawtext=fontfile=${font}:text='Checks design support comparator evidence temporal order confounders uncertainty':x=64:y=360:fontsize=26:fontcolor=0x34413b`,
  `drawtext=fontfile=${font}:text='Validation passed npm test plus demo plus syntax check':x=64:y=424:fontsize=26:fontcolor=0x34413b`,
  `drawtext=fontfile=${font}:text='No external APIs credentials private manuscripts or live data':x=64:y=488:fontsize=26:fontcolor=0x34413b`
].join(",");

const result = spawnSync(ffmpeg, [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0xf8faf7:s=1280x720:d=8:r=30",
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

console.log(JSON.stringify({ out, bytes: require("node:fs").statSync(out).size }, null, 2));
