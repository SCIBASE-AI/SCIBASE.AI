const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const reportDir = path.join(__dirname, "reports");
const outputPath = path.join(reportDir, "demo.webm");

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].filter(Boolean);

function findBrowser() {
  const found = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error("Chrome or Edge was not found. Set CHROME_PATH to generate reports/demo.webm.");
  }
  return found;
}

function fileUrl(filePath) {
  return `file:///${filePath.replace(/\\/g, "/")}`;
}

const html = String.raw`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Analytics license seat roster guard demo</title>
  <style>
    html, body { margin: 0; background: #f8fafc; }
    canvas { width: 960px; height: 540px; }
    pre { white-space: pre-wrap; word-break: break-all; color: #f8fafc; font-size: 1px; }
  </style>
</head>
<body>
  <canvas id="stage" width="960" height="540"></canvas>
  <pre id="out">recording</pre>
  <script>
    const canvas = document.getElementById("stage");
    const ctx = canvas.getContext("2d");
    const out = document.getElementById("out");
    const items = [
      ["Roster overage", "Dashboard seats exceed contract without finance approval."],
      ["Domain leakage", "partner-lab.com is outside signed analytics license domains."],
      ["API seat mismatch", "Viewer seat generated analytics API usage."],
      ["Finance packet", "True-up actions, exposure, and safety notes exported."]
    ];

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function draw(frame) {
      const t = frame / 48;
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 34px Arial";
      ctx.fillText("Analytics License Seat Roster Guard", 48, 64);
      ctx.font = "19px Arial";
      ctx.fillStyle = "#475569";
      ctx.fillText("SCIBASE #20 revenue infrastructure demo: named-seat true-up evidence", 48, 98);

      ctx.fillStyle = "#e2e8f0";
      roundRect(48, 126, 864, 30, 8);
      ctx.fill();
      ctx.fillStyle = "#0f766e";
      roundRect(48, 126, 864 * Math.min(1, t), 30, 8);
      ctx.fill();

      items.forEach(([title, text], index) => {
        const y = 192 + index * 72;
        const active = Math.floor(t * 4.2) >= index;
        ctx.fillStyle = active ? "#ffffff" : "#eef2f7";
        ctx.strokeStyle = active ? "#0f766e" : "#cbd5e1";
        ctx.lineWidth = active ? 3 : 1;
        roundRect(48, y, 864, 54, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = active ? "#0f766e" : "#64748b";
        ctx.font = "bold 18px Arial";
        ctx.fillText(title, 70, y + 22);
        ctx.fillStyle = "#334155";
        ctx.font = "16px Arial";
        ctx.fillText(text, 70, y + 44);
      });

      ctx.fillStyle = "#64748b";
      ctx.font = "15px Arial";
      ctx.fillText("Synthetic data only. No payment processors, SSO/SCIM calls, ERP writes, or private customer data.", 48, 504);
    }

    async function main() {
      if (!window.MediaRecorder) {
        out.textContent = "ERROR: MediaRecorder unavailable";
        return;
      }
      draw(0);
      const stream = canvas.captureStream(12);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          out.textContent = reader.result;
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      let frame = 0;
      const timer = setInterval(() => {
        draw(frame);
        frame += 1;
        if (frame >= 48) {
          clearInterval(timer);
          recorder.stop();
          stream.getTracks().forEach((track) => track.stop());
        }
      }, 83);
    }

    main();
  </script>
</body>
</html>`;

fs.mkdirSync(reportDir, { recursive: true });

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "analytics-license-demo-"));
const htmlPath = path.join(tempDir, "demo.html");
const profileDir = path.join(tempDir, "profile");
fs.writeFileSync(htmlPath, html, "utf8");

const stdout = execFileSync(
  findBrowser(),
  [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--autoplay-policy=no-user-gesture-required",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=7000",
    `--user-data-dir=${profileDir}`,
    "--dump-dom",
    fileUrl(htmlPath)
  ],
  { encoding: "utf8", maxBuffer: 30 * 1024 * 1024 }
);

const match = stdout.match(/data:video\/webm;base64,([A-Za-z0-9+/=]+)/);
if (!match) {
  throw new Error(`Demo video generation failed. Browser output ended with: ${stdout.slice(-600)}`);
}

fs.writeFileSync(outputPath, Buffer.from(match[1], "base64"));
console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
