const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const videoPath = path.join(__dirname, "reports", "demo.mp4");
assert.ok(fs.existsSync(videoPath), "reports/demo.mp4 must exist");
assert.ok(fs.statSync(videoPath).size > 5000, "reports/demo.mp4 should not be empty");

const probe = spawnSync(process.env.FFPROBE_PATH || "ffprobe", [
  "-v",
  "error",
  "-select_streams",
  "v:0",
  "-show_entries",
  "stream=codec_name,width,height,r_frame_rate:format=duration",
  "-of",
  "json",
  videoPath
], { encoding: "utf8" });

if (probe.status !== 0) {
  process.stderr.write(probe.stderr || "ffprobe failed\n");
  process.exit(probe.status || 1);
}

const metadata = JSON.parse(probe.stdout);
const stream = metadata.streams && metadata.streams[0];
assert.equal(stream.codec_name, "h264");
assert.equal(stream.width, 960);
assert.equal(stream.height, 540);
assert.equal(stream.r_frame_rate, "18/1");

const duration = Number(metadata.format && metadata.format.duration);
assert.ok(duration >= 3.9 && duration <= 4.2, `unexpected duration ${duration}`);

console.log(`demo.mp4 verified: ${stream.codec_name}, ${stream.width}x${stream.height}, ${duration.toFixed(3)}s, ${stream.r_frame_rate}`);
