const { evaluatePortfolio, sampleProjects } = require("./index");

function runDemo() {
  const portfolio = evaluatePortfolio(sampleProjects);
  const rows = portfolio.results.map((result) => ({
    project: result.projectId,
    status: result.status,
    destination: result.exportPacket.destination || "none",
    blockers: result.blockers.length,
    warnings: result.warnings.length,
    digest: result.exportPacket.evidenceDigest.slice(0, 12),
  }));

  console.table(rows);
  console.log(
    JSON.stringify(
      {
        ready: portfolio.ready,
        blocked: portfolio.blocked,
        total: portfolio.total,
        portfolioDigest: portfolio.portfolioDigest,
        webhookEvents: portfolio.results.map((result) => result.webhookEvent),
      },
      null,
      2,
    ),
  );
}

runDemo();
