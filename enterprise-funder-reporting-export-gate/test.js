const assert = require("assert");

const {
  chooseDestination,
  collectBlockers,
  digest,
  evaluatePortfolio,
  evaluateProject,
  sampleProjects,
} = require("./index");

function run() {
  const readyProject = sampleProjects[0];
  const embargoProject = sampleProjects[1];
  const lowReproProject = sampleProjects[2];

  const readyResult = evaluateProject(readyProject);
  assert.strictEqual(readyResult.status, "ready");
  assert.deepStrictEqual(readyResult.blockers, []);
  assert.strictEqual(readyResult.exportPacket.destination, "pubmed-central");
  assert.strictEqual(readyResult.webhookEvent.blockerCount, 0);

  const embargoResult = evaluateProject(embargoProject);
  assert.strictEqual(embargoResult.status, "ready");
  assert.ok(
    embargoResult.warnings.some((warning) => warning.includes("embargo until")),
  );
  assert.strictEqual(embargoResult.exportPacket.destination, "zenodo");

  const lowReproResult = evaluateProject(lowReproProject);
  assert.strictEqual(lowReproResult.status, "blocked");
  assert.ok(
    lowReproResult.blockers.some((blocker) =>
      blocker.includes("Reproducibility score"),
    ),
  );
  assert.ok(lowReproResult.warnings.some((warning) => warning.includes("DOI")));

  assert.strictEqual(chooseDestination(readyProject), "pubmed-central");
  assert.strictEqual(
    chooseDestination({ ...readyProject, funder: "unknown", destinations: [] }),
    null,
  );

  const missingArtifact = {
    ...readyProject,
    artifacts: {
      ...readyProject.artifacts,
      dataset: {},
    },
  };
  assert.ok(
    collectBlockers(missingArtifact).blockers.includes(
      "Missing dataset artifact hash.",
    ),
  );

  const portfolio = evaluatePortfolio(sampleProjects);
  assert.strictEqual(portfolio.total, 3);
  assert.strictEqual(portfolio.ready, 2);
  assert.strictEqual(portfolio.blocked, 1);

  const firstDigest = digest(readyResult.webhookEvent);
  const secondDigest = digest(evaluateProject(readyProject).webhookEvent);
  assert.strictEqual(firstDigest, secondDigest);

  console.log("enterprise funder reporting export gate tests passed");
}

run();
