import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRepositoryRelease, diffDatasetRows } from "./index.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fixture = JSON.parse(readFileSync(join(root, "sample", "repository-fixture.json"), "utf8"));
const release = buildRepositoryRelease(fixture.repository, fixture.changeSet, fixture.releaseOptions);
const diff = diffDatasetRows(fixture.datasetBefore, fixture.datasetAfter);

console.log(
  JSON.stringify(
    {
      repositoryId: release.repositoryId,
      ready: release.releaseTag.ready,
      tag: release.releaseTag.tag,
      exportBundle: release.exportBundle.filename,
      missingComponents: release.manifest.missingComponents,
      datasetDiff: diff,
      citation: release.releaseTag.citation,
      auditHash: release.auditHash,
    },
    null,
    2,
  ),
);
