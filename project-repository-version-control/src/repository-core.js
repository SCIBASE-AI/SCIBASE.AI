import crypto from "node:crypto";

export const demoRepository = {
  id: "repo-organoid-response",
  title: "Organoid chemotherapy response atlas",
  doiPrefix: "10.5555/scibase",
  visibility: "public",
  authors: [
    { name: "Alice Chen", orcid: "0000-0002-1825-0097", affiliation: "SCIBASE Oncology Lab" },
    { name: "Mateo Rivera", orcid: "0000-0003-2201-4120", affiliation: "Open Reproducibility Center" }
  ],
  files: {
    "manuscript/main.md": "# Predicting chemotherapy response\n\nPatient-derived organoids predict response.",
    "data/growth_curves.csv": "sample,dose,response\nP001,0.1,0.83\nP001,1.0,0.32\n",
    "code/run_analysis.py": "print('fit random forest with fixed seed 42')\n",
    "notebooks/qc.ipynb": "{\"cells\":[],\"metadata\":{\"kernel\":\"python3\"}}",
    "results/figure-1.svg": "<svg><text>dose response</text></svg>",
    "protocols/organoid-culture.md": "Seed organoids, dose compounds, capture viability.",
    "metadata.json": JSON.stringify({
      license: "CC-BY-4.0",
      tags: ["oncology", "organoids", "reproducibility"],
      funding: ["Open Science Accelerator"],
      schema: "https://schema.org/Dataset"
    })
  },
  branches: {
    main: ["commit-root", "commit-analysis-v1"],
    "hypothesis-resistant-cohort": ["commit-root", "commit-analysis-v1", "commit-resistant-cohort"]
  },
  commits: [
    {
      id: "commit-root",
      message: "Initial repository scaffold",
      author: "Alice Chen",
      createdAt: "2026-05-01T10:00:00.000Z",
      parent: null,
      changedFiles: ["manuscript/main.md", "metadata.json"]
    },
    {
      id: "commit-analysis-v1",
      message: "Add analysis code, data, and first figure",
      author: "Mateo Rivera",
      createdAt: "2026-05-03T14:20:00.000Z",
      parent: "commit-root",
      changedFiles: ["data/growth_curves.csv", "code/run_analysis.py", "results/figure-1.svg"]
    },
    {
      id: "commit-resistant-cohort",
      message: "Explore resistant cohort hypothesis",
      author: "Alice Chen",
      createdAt: "2026-05-05T09:15:00.000Z",
      parent: "commit-analysis-v1",
      changedFiles: ["manuscript/main.md", "notebooks/qc.ipynb"]
    }
  ],
  forks: [
    {
      id: "fork-validation-lab",
      owner: "Validation Lab",
      sourceCommit: "commit-analysis-v1",
      attribution: "Derived from Organoid chemotherapy response atlas",
      createdAt: "2026-05-06T12:00:00.000Z"
    }
  ],
  mergeRequests: [
    {
      id: "mr-resistant-cohort",
      sourceBranch: "hypothesis-resistant-cohort",
      targetBranch: "main",
      status: "open",
      reviewers: ["Mateo Rivera"],
      discussion: ["Please add confidence intervals before merge."],
      changedFiles: ["manuscript/main.md", "notebooks/qc.ipynb"]
    }
  ],
  reproducibility: {
    pipeline: "notebooks/qc.ipynb",
    container: "Dockerfile",
    environment: "environment.yml",
    rawDataHash: "sha256:raw-growth-curve-fixture",
    expectedOutputs: ["results/figure-1.svg"],
    lastRun: {
      status: "passed",
      durationSeconds: 42,
      sandbox: "node-local-demo",
      completedAt: "2026-05-07T16:30:00.000Z"
    }
  }
};

export function buildManifest(repository = demoRepository) {
  const fileEntries = Object.entries(repository.files).map(([path, contents]) => ({
    path,
    component: path.split("/")[0],
    bytes: Buffer.byteLength(contents),
    hash: sha256(contents)
  }));
  return {
    repositoryId: repository.id,
    title: repository.title,
    visibility: repository.visibility,
    doi: `${repository.doiPrefix}.${repository.id}.v1`,
    authors: repository.authors,
    components: groupByComponent(fileEntries),
    files: fileEntries,
    integrityHash: sha256(fileEntries.map((file) => `${file.path}:${file.hash}`).join("|"))
  };
}

export function createCommit(repository, { message, author, branch = "main", changes }) {
  const parent = repository.branches[branch]?.at(-1) || null;
  const changedFiles = Object.keys(changes);
  const nextFiles = { ...repository.files, ...changes };
  const id = `commit-${sha256(`${parent}:${message}:${changedFiles.join(",")}`).slice(0, 12)}`;
  return {
    repository: {
      ...repository,
      files: nextFiles,
      branches: { ...repository.branches, [branch]: [...(repository.branches[branch] || []), id] },
      commits: [
        ...repository.commits,
        { id, message, author, createdAt: new Date("2026-05-09T00:00:00.000Z").toISOString(), parent, changedFiles }
      ]
    },
    commit: { id, parent, changedFiles }
  };
}

export function diffFiles(before, after) {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const max = Math.max(beforeLines.length, afterLines.length);
  const hunks = [];
  for (let index = 0; index < max; index += 1) {
    if (beforeLines[index] !== afterLines[index]) {
      if (beforeLines[index] !== undefined) hunks.push({ type: "remove", line: index + 1, text: beforeLines[index] });
      if (afterLines[index] !== undefined) hunks.push({ type: "add", line: index + 1, text: afterLines[index] });
    }
  }
  return hunks;
}

export function buildMergeRequestSummary(repository = demoRepository, mrId = "mr-resistant-cohort") {
  const mr = repository.mergeRequests.find((item) => item.id === mrId);
  if (!mr) throw new Error(`Unknown merge request: ${mrId}`);
  const timeline = repository.branches[mr.sourceBranch].map((commitId) => repository.commits.find((commit) => commit.id === commitId));
  return {
    ...mr,
    commitCount: timeline.length,
    timeline,
    diffs: mr.changedFiles.map((path) => ({
      path,
      type: path.endsWith(".ipynb") ? "notebook-aware" : path.endsWith(".md") ? "markdown-aware" : "text",
      hunks: diffFiles(repository.files[path] || "", mutateForDemo(path, repository.files[path] || ""))
    }))
  };
}

export function runReproducibilityCheck(repository = demoRepository) {
  const manifest = buildManifest(repository);
  const files = new Set(manifest.files.map((file) => file.path));
  const checks = [
    { name: "analysis pipeline", passed: files.has(repository.reproducibility.pipeline) },
    { name: "raw data hash", passed: repository.reproducibility.rawDataHash.startsWith("sha256:") },
    { name: "expected outputs", passed: repository.reproducibility.expectedOutputs.every((path) => files.has(path)) },
    { name: "metadata schema", passed: files.has("metadata.json") && repository.files["metadata.json"].includes("schema") },
    { name: "sandbox execution", passed: repository.reproducibility.lastRun.status === "passed" }
  ];
  return {
    status: checks.every((check) => check.passed) ? "passed" : "failed",
    checks,
    integrityHash: manifest.integrityHash,
    lastRun: repository.reproducibility.lastRun
  };
}

export function buildCitation(repository = demoRepository, style = "APA") {
  const year = "2026";
  const authors = repository.authors.map((author) => author.name);
  const doi = `${repository.doiPrefix}.${repository.id}.v1`;
  if (style === "BibTeX") {
    return `@dataset{${repository.id}, title={${repository.title}}, author={${authors.join(" and ")}}, year={${year}}, doi={${doi}}}`;
  }
  if (style === "MLA") return `${authors.join(", ")}. "${repository.title}." SCIBASE.AI, ${year}, doi:${doi}.`;
  return `${authors.join(", ")} (${year}). ${repository.title}. SCIBASE.AI. https://doi.org/${doi}`;
}

export function buildExportBundle(repository = demoRepository) {
  const manifest = buildManifest(repository);
  return {
    fileName: `${repository.id}-v1-export.zip`,
    manifest,
    includedComponents: Object.keys(manifest.components),
    apiRoutes: [
      `GET /api/repositories/${repository.id}`,
      `GET /api/repositories/${repository.id}/manifest`,
      `GET /api/repositories/${repository.id}/export`
    ],
    cliCommand: `scibase clone ${repository.id} --tag v1`
  };
}

export function buildDashboard(repository = demoRepository) {
  return {
    manifest: buildManifest(repository),
    mergeRequest: buildMergeRequestSummary(repository),
    reproducibility: runReproducibilityCheck(repository),
    citation: {
      apa: buildCitation(repository, "APA"),
      mla: buildCitation(repository, "MLA"),
      bibtex: buildCitation(repository, "BibTeX")
    },
    exportBundle: buildExportBundle(repository)
  };
}

function groupByComponent(files) {
  return files.reduce((groups, file) => {
    groups[file.component] ||= { fileCount: 0, bytes: 0 };
    groups[file.component].fileCount += 1;
    groups[file.component].bytes += file.bytes;
    return groups;
  }, {});
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function mutateForDemo(path, value) {
  if (path.endsWith(".md")) return `${value}\n\nProspective validation will be added before publication.`;
  if (path.endsWith(".ipynb")) return value.replace("\"cells\":[]", "\"cells\":[{\"cell_type\":\"markdown\",\"source\":[\"QC complete\"]}]");
  return value;
}
