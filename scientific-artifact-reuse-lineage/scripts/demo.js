import { readFile } from "node:fs/promises";
import { buildArtifactReuseLineage, validateLineageInput } from "../src/artifact-reuse-lineage.js";

const input = JSON.parse(
  await readFile(new URL("../data/sample-lineage.json", import.meta.url), "utf8")
);
const errors = validateLineageInput(input);

if (errors.length > 0) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exitCode = 1;
} else {
  const result = buildArtifactReuseLineage(input);
  console.log(
    JSON.stringify(
      {
        ok: true,
        dashboard: result.dashboard,
        datasetReuse: result.graphQueries.projectsByDataset,
        notebookExperiments: result.graphQueries.experimentsByNotebook,
        recommendations: result.recommendations,
        topCuratorActions: result.curatorActions.slice(0, 5)
      },
      null,
      2
    )
  );
}
