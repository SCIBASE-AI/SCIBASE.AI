import { buildDemoReport } from "./demo.js";
import { repository } from "./sample-data.js";
import {
  buildContentIndex,
  buildExportBundle,
  buildRepositoryManifest,
  createCommit,
  createSemanticTag,
  runReproducibilityChecks
} from "./repository-ledger.js";

export function handleRepositoryRequest(route) {
  const report = buildDemoReport();
  switch (route) {
    case "manifest":
      return buildRepositoryManifest(repository);
    case "content-index":
      return buildContentIndex(repository);
    case "commit":
      return createCommit(repository, {
        message: "API preview commit",
        author: "Ada Rivera",
        touchedPaths: ["manuscript/main.md"]
      });
    case "reproducibility":
      return runReproducibilityChecks(repository);
    case "export": {
      const commit = report.commit;
      const tag = createSemanticTag(repository, commit, "v1.2.0");
      return buildExportBundle(repository, tag);
    }
    case "demo":
      return report;
    default:
      throw new Error(`Unknown route: ${route}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [route = "demo"] = process.argv.slice(2);
  console.log(JSON.stringify(handleRepositoryRequest(route), null, 2));
}
