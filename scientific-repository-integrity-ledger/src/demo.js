import {
  buildExportBundle,
  buildForkRecord,
  buildMergeRequest,
  buildRepositoryManifest,
  createCommit,
  createSemanticTag,
  runReproducibilityChecks
} from "./repository-ledger.js";
import { forkRepository, repository } from "./sample-data.js";

export function buildDemoReport() {
  const commit = createCommit(repository, {
    message: "Add cleaned cohort data and reproducibility notebook",
    author: "Ada Rivera",
    touchedPaths: ["data/raw/heat-health.csv", "notebooks/reproduce.ipynb"]
  });
  const tag = createSemanticTag(repository, commit, "preprint-v1");
  return {
    manifest: buildRepositoryManifest(repository),
    commit,
    tag,
    fork: buildForkRecord(repository, forkRepository),
    mergeRequest: buildMergeRequest(repository, "experiment/canopy-sensitivity", [commit]),
    reproducibility: runReproducibilityChecks(repository),
    exportBundle: buildExportBundle(repository, tag)
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(buildDemoReport(), null, 2));
}
