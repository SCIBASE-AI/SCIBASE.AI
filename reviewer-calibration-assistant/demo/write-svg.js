import { readFileSync, writeFileSync } from "node:fs";

const result = JSON.parse(readFileSync("reports/reviewer-calibration-report.json", "utf8"));
const blockerLines = result.blockers.slice(0, 5).map((blocker, index) =>
  `<text x="72" y="${402 + index * 34}" class="small">${blocker}</text>`
).join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f7f8fb"/>
  <rect x="48" y="48" width="1184" height="624" rx="10" fill="#ffffff" stroke="#d8dde8"/>
  <text x="72" y="116" class="title">Reviewer Calibration Assistant</text>
  <text x="72" y="158" class="subtitle">AI-Powered Research Assistant Suite evidence artifact</text>

  <rect x="72" y="210" width="250" height="118" rx="8" fill="#eef6ff"/>
  <text x="96" y="254" class="label">Decision</text>
  <text x="96" y="296" class="metric">${result.decision}</text>

  <rect x="356" y="210" width="250" height="118" rx="8" fill="#f2fbf4"/>
  <text x="380" y="254" class="label">Agreement</text>
  <text x="380" y="296" class="metric">${result.pairwiseAgreement}</text>

  <rect x="640" y="210" width="250" height="118" rx="8" fill="#fff8eb"/>
  <text x="664" y="254" class="label">Consensus</text>
  <text x="664" y="296" class="metric">${result.consensusAction}</text>

  <rect x="924" y="210" width="250" height="118" rx="8" fill="#fff1f1"/>
  <text x="948" y="254" class="label">Blockers</text>
  <text x="948" y="296" class="metric">${result.blockers.length}</text>

  <text x="72" y="374" class="section">Calibration blockers</text>
  ${blockerLines}
  <text x="72" y="614" class="footer">Synthetic data only. No private manuscripts, external AI APIs, credentials, or payment systems.</text>
  <style>
    text { font-family: Arial, Helvetica, sans-serif; fill: #1f2937; }
    .title { font-size: 42px; font-weight: 700; }
    .subtitle { font-size: 22px; fill: #5b6472; }
    .label { font-size: 20px; fill: #5b6472; }
    .metric { font-size: 24px; font-weight: 700; }
    .section { font-size: 26px; font-weight: 700; }
    .small { font-size: 22px; }
    .footer { font-size: 18px; fill: #6b7280; }
  </style>
</svg>
`;

writeFileSync("reports/reviewer-calibration-summary.svg", svg);
