const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { studies } = require("./sample-data");
const { reviewStudies } = require("./index");

function ffmpegCandidates() {
  return ["ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
}

function makeVideo(output) {
  const report = reviewStudies(studies);
  const readyWidth = 120 + report.summary.reviewerReady * 190;
  const targetedWidth = 120 + report.summary.targetedRevision * 190;
  const majorWidth = 120 + report.summary.majorRevision * 190;
  const blockedWidth = 120 + report.summary.blocked * 190;
  const scoreWidth = Math.max(80, Math.round(report.summary.averageEvidenceScore * 8));
  const filter = [
    "drawbox=x=0:y=0:w=1280:h=720:color=0x0b1020@1:t=fill",
    "drawbox=x=80:y=100:w=1120:h=10:color=0x4dabf7@1:t=fill",
    `drawbox=x=120:y=200:w=${readyWidth}:h=72:color=0x2f9e44@1:t=fill`,
    `drawbox=x=120:y=300:w=${targetedWidth}:h=72:color=0x1971c2@1:t=fill`,
    `drawbox=x=120:y=400:w=${majorWidth}:h=72:color=0xf08c00@1:t=fill`,
    `drawbox=x=120:y=500:w=${blockedWidth}:h=72:color=0xd6336c@1:t=fill`,
    `drawbox=x=120:y=620:w=${scoreWidth}:h=26:color=0xadb5bd@1:t=fill`,
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
