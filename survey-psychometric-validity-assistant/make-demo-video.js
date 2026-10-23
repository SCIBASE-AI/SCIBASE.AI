import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { evaluateSurveyPacket } from "./src/guard.js";
import { cleanPacket, riskyPacket } from "./src/samplePackets.js";

const reportsDir = new URL("./reports/", import.meta.url);
await mkdir(reportsDir, { recursive: true });

const output = new URL("demo.mp4", reportsDir);
const clean = evaluateSurveyPacket(cleanPacket);
const risky = evaluateSurveyPacket(riskyPacket);
const filter = [
  "color=c=0xf8fafc:s=960x540:d=5:r=12",
  "drawbox=x=48:y=52:w=864:h=436:color=0xcbd5e1:t=2",
  `drawtext=text='Survey Psychometric Validity Assistant':x=78:y=92:fontsize=34:fontcolor=0x111827`,
  `drawtext=text='AI review release gate for survey manuscripts':x=78:y=146:fontsize=23:fontcolor=0x334155`,
  `drawtext=text='Checks reverse coding, reliability, factor loadings, CFA sample size':x=78:y=204:fontsize=22:fontcolor=0x111827`,
  `drawtext=text='Clean ${clean.decision} - Risky ${risky.decision} - Findings ${risky.findingCount}':x=78:y=276:fontsize=34:fontcolor=0x991b1b`,
  `drawtext=text='Action - psychometric reviewer required before AI output is trusted':x=78:y=344:fontsize=22:fontcolor=0x111827`,
  "drawbox=x=78:y=402:w=660:h=18:color=0xfee2e2:t=18",
  "drawbox=x=78:y=402:w=540:h=18:color=0xef4444:t=18"
].join(",");

const result = spawnSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  filter,
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  fileURLToPath(output)
], { stdio: "inherit" });

if (result.status !== 0) {
  throw new Error(`ffmpeg failed with status ${result.status}`);
}

console.log(`wrote ${fileURLToPath(output)}`);
