import { mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";

const root = process.cwd();
const reportsDir = join(root, "reports");
const output = join(reportsDir, "demo.mp4");
const ffmpeg = resolve(root, "..", "..", "tool_downloads", "video_tools", "node_modules", "ffmpeg-static", "ffmpeg.exe");
const font = "C\\:/Windows/Fonts/arial.ttf";

await mkdir(reportsDir, { recursive: true });
const report = JSON.parse(await readFile(join(reportsDir, "summary.json"), "utf8").catch(async () => {
  throw new Error("Run npm run demo before npm run video so reports/summary.json exists.");
}));

const counts = report.decisionCounts || {};
const release = counts.RELEASE_ASSISTANT_OUTPUT || 0;
const revise = counts.REVISE_ASSISTANT_OUTPUT || 0;
const hold = counts.HOLD_ASSISTANT_OUTPUT || 0;
const headline = "SCIBASE #16: Compute Rerun Feasibility Guard";
const subhead = `Release ${release} | Revise ${revise} | Hold ${hold}`;
const caption = "Synthetic demo: no desktop capture, private data, API keys, or paid cloud.";

const drawText = [
  `drawtext=fontfile=${font}:text='${escapeDrawText(headline)}':fontsize=42:fontcolor=white:x=60:y=80`,
  `drawtext=fontfile=${font}:text='${escapeDrawText(subhead)}':fontsize=34:fontcolor=0x8ee6a7:x=60:y=160`,
  `drawtext=fontfile=${font}:text='${escapeDrawText("Gate AI reproducibility claims on hardware, memory, runtime, determinism, and disclosure evidence.")}':fontsize=24:fontcolor=white:x=60:y=250`,
  `drawtext=fontfile=${font}:text='${escapeDrawText(caption)}':fontsize=22:fontcolor=0xcbd5e1:x=60:y=610`
].join(",");

await run(ffmpeg, [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0x101827:s=1280x720:d=8:r=30",
  "-vf",
  drawText,
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  output
]);

console.log(`Wrote ${output}`);

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${command} exited with ${code}`));
      }
    });
  });
}

function escapeDrawText(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(":", "\\:")
    .replaceAll("'", "\\'")
    .replaceAll(",", "\\,");
}
