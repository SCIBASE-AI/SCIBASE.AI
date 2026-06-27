import { spawnSync } from "node:child_process";
import path from "node:path";
import { riskyPacket } from "./src/samplePackets.js";
import { evaluateFabricationAnomalyPacket } from "./src/assistant.js";

const reportsDir = path.join(process.cwd(), "reports");
const demoMp4 = path.join(reportsDir, "demo.mp4");
const resultPacket = evaluateFabricationAnomalyPacket(riskyPacket);

function escapeDrawtext(text) {
  return text.replaceAll("\\", "\\\\").replaceAll(":", "\\:").replaceAll("'", "\\'");
}

const font = "C\\:/Windows/Fonts/arial.ttf";
const lines = [
  "Data Fabrication Anomaly Assistant",
  `Decision ${resultPacket.decision} | Findings ${resultPacket.findingCount}`,
  "Flags duplicate rows, invalid timestamps, digit preference, smooth series, and perfect separation.",
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
    "color=c=0x111827:s=960x540:r=12",
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
