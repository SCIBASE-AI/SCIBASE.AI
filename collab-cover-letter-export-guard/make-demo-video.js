import { spawnSync } from "node:child_process";
import path from "node:path";
import { riskySubmissionPacket } from "./src/samplePackets.js";
import { evaluateCoverLetterExportPacket } from "./src/guard.js";

const reportsDir = path.join(process.cwd(), "reports");
const demoMp4 = path.join(reportsDir, "demo.mp4");
const resultPacket = evaluateCoverLetterExportPacket(riskySubmissionPacket);

function escapeDrawtext(text) {
  return text.replaceAll("\\", "\\\\").replaceAll(":", "\\:").replaceAll("'", "\\'");
}

const font = "C\\:/Windows/Fonts/arial.ttf";
const lines = [
  "Collaborative Cover-Letter Export Guard",
  `Decision ${resultPacket.decision} | Findings ${resultPacket.findingCount}`,
  "Blocks stale hashes, approval drift, claim mismatches, and private-note leakage.",
  `Audit digest ${resultPacket.auditDigest}`,
];
const drawText = lines
  .map(
    (line, index) =>
      `drawtext=fontfile='${font}':text='${escapeDrawtext(line)}':x=48:y=${64 + index * 72}:fontsize=${index === 0 ? 34 : 24}:fontcolor=${index === 1 ? "0xffdddd" : "white"}`,
  )
  .join(",");

const result = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x101827:s=960x540:r=12",
    "-t",
    "4",
    "-vf",
    `${drawText},format=yuv420p`,
    "-an",
    demoMp4,
  ],
  { encoding: "utf8" },
);

if (result.status !== 0) {
  throw new Error(result.stderr || "ffmpeg failed to render demo.mp4");
}

console.log(`Wrote ${path.relative(process.cwd(), demoMp4)}`);
