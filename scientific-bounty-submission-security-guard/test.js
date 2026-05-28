const assert = require("assert");
const { submissions } = require("./sample-data");
const { reviewSubmissions, hasPathEscape, hasNetworkCall } = require("./index");

function byId(report, id) {
  return report.results.find((result) => result.submissionId === id);
}

function runTests() {
  assert.strictEqual(hasPathEscape("../secret.csv"), true);
  assert.strictEqual(hasPathEscape("/tmp/out.csv"), true);
  assert.strictEqual(hasPathEscape("results/metrics.csv"), false);
  assert.strictEqual(hasNetworkCall("requests.get('https://example.com')"), true);
  assert.strictEqual(hasNetworkCall("pd.read_csv('local.csv')"), false);

  const report = reviewSubmissions(submissions);
  assert.strictEqual(report.summary.submissionCount, 4);

  const clean = byId(report, "sub-clean-model");
  assert.strictEqual(clean.decision, "clear-for-review");
  assert.strictEqual(clean.securityScore, 100);
  assert.strictEqual(clean.issues.length, 0);

  const notebook = byId(report, "sub-network-notebook");
  assert.strictEqual(notebook.decision, "hold-sponsor-review");
  assert.ok(notebook.issues.some((issue) => issue.code === "notebook-network-call"));
  assert.ok(notebook.issues.some((issue) => issue.code === "shell-notebook-cell"));
  assert.ok(notebook.issues.some((issue) => issue.code === "bundled-secret-like-env"));

  const dependency = byId(report, "sub-dependency-hook");
  assert.strictEqual(dependency.decision, "quarantine-submission");
  assert.ok(dependency.issues.some((issue) => issue.code === "dependency-lifecycle-script"));

  const container = byId(report, "sub-escape-and-privileged-container");
  assert.strictEqual(container.decision, "hold-sponsor-review");
  assert.ok(container.issues.some((issue) => issue.code === "path-escape"));
  assert.ok(container.issues.some((issue) => issue.code === "privileged-container"));
  assert.ok(container.issues.some((issue) => issue.code === "host-mount-request"));

  console.log("submission security guard tests passed");
}

runTests();
