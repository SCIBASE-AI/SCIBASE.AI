const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { documentState, requests } = require("./sample-data");
const { evaluateUndoRedoBatch } = require("./index");

function ffmpegCandidates() {
  return ["ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
}

function makeVideo(output) {
  const report = evaluateUndoRedoBatch(documentState, requests);
  const allowWidth = 120 + report.summary.allowed * 120;
  const deferWidth = 120 + report.summary.deferred * 120;
  const blockWidth = 120 + report.summary.blocked * 120;
  const filter = [
    "drawbox=x=0:y=0:w=1280:h=720:color=0x0b1020@1:t=fill",
    "drawbox=x=80:y=110:w=1120:h=8:color=0x4dabf7@1:t=fill",
    `drawbox=x=120:y=220:w=${allowWidth}:h=90:color=0x2f9e44@1:t=fill`,
    `drawbox=x=120:y=340:w=${deferWidth}:h=90:color=0xf08c00@1:t=fill`,
    `drawbox=x=120:y=460:w=${blockWidth}:h=90:color=0xd6336c@1:t=fill`,
    "drawbox=x=120:y=590:w=1020:h=24:color=0x495057@1:t=fill",
  ].join(",");

  const errors = [];
  for (const ffmpeg of ffmpegCandidates()) {
    const result = spawnSync(
      ffmpeg,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=1280x720:r=12:d=4",
        "-vf",
        filter,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        output,
      ],
      { encoding: "utf8" },
    );

    if (result.status === 0 && fs.existsSync(output) && fs.statSync(output).size > 1000) {
      return;
    }

    const stderr = (result.stderr || result.error || "").toString();
    errors.push(`${ffmpeg}: ${stderr.split("\n").slice(-8).join("\n")}`);
  }

  throw new Error(`ffmpeg failed to generate demo video:\n${errors.join("\n")}`);
}

function main() {
  const reportDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  const output = path.join(reportDir, "demo.mp4");
  makeVideo(output);
  console.log(`demo video generated: ${output}`);
}

main();
