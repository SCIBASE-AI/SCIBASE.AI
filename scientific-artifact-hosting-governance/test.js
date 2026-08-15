const assert = require("assert");
const {
  buildArtifactManifest,
  detectArtifactType,
  diffArtifactVersions,
  evaluateArtifactHosting,
  metadataIdentifierType,
  validateHostingIntegrity,
  validateRuntimeEnvironment,
} = require("./index");
const {previousDataset, project} = require("./sample-data");

function testTypeDetection() {
  assert.strictEqual(detectArtifactType({name: "measurements.csv"}), "dataset");
  assert.strictEqual(detectArtifactType({name: "analysis.ipynb"}), "notebook");
  assert.strictEqual(detectArtifactType({name: "workflow.py"}), "code");
  assert.strictEqual(detectArtifactType({name: "figure.svg"}), "figure");
  assert.strictEqual(detectArtifactType({name: "unknown.bin"}), "supplement");
}

function testManifestBuildsPreviewAndHashes() {
  const manifest = buildArtifactManifest(project);
  const dataset = manifest.find((artifact) => artifact.id === "artifact-cell-counts");
  const notebook = manifest.find((artifact) => artifact.id === "artifact-notebook");

  assert.strictEqual(manifest.length, 3);
  assert.strictEqual(dataset.type, "dataset");
  assert.strictEqual(dataset.preview.rowCount, 3);
  assert.deepStrictEqual(dataset.preview.columns, ["sample", "condition", "count"]);
  assert.strictEqual(dataset.metadataCheck.ok, true);
  assert.strictEqual(dataset.contentHash.length, 64);
  assert.strictEqual(notebook.preview.kind, "notebook");
}

function testMissingMetadataBlocksReadiness() {
  const incomplete = {
    ...project,
    artifacts: [
      {
        id: "artifact-bad",
        name: "bad.csv",
        content: "id,value\n1,2\n",
      },
    ],
  };
  const result = evaluateArtifactHosting(incomplete);

  assert.strictEqual(result.hostingReadiness, "blocked");
  assert(result.blockers.includes("artifact_metadata_incomplete:artifact-bad"));
}

function testVersionDiffs() {
  const diff = diffArtifactVersions(previousDataset, project.artifacts[0]);

  assert.strictEqual(diff.artifactId, "artifact-cell-counts");
  assert.strictEqual(diff.previousVersion, "1.0");
  assert.strictEqual(diff.currentVersion, "1.1");
  assert(diff.changes.includes("content_changed"));
}

function testRuntimeReadiness() {
  assert.strictEqual(validateRuntimeEnvironment(project.executionEnvironment).ok, true);
  assert.deepStrictEqual(validateRuntimeEnvironment({type: "docker"}).missing, ["image_or_definition_file", "commands"]);
}

function testFullEvaluationExportsMetadata() {
  const result = evaluateArtifactHosting(project);

  assert.strictEqual(result.hostingReadiness, "ready_for_review");
  assert(result.fairScore > 80);
  assert.strictEqual(result.jsonLd["@type"], "Dataset");
  assert.strictEqual(result.jsonLd.distribution.length, 3);
  assert.strictEqual(result.dataCite.relatedIdentifiers.length, 3);
  assert.strictEqual(result.dataCite.relatedIdentifiers[0].relatedIdentifierType, "DOI");
  assert.strictEqual(result.dataCite.relatedIdentifiers[1].relatedIdentifierType, "LocalId");
  assert.strictEqual(result.auditHash.length, 64);
}

function testMetadataIdentifierTypes() {
  assert.strictEqual(metadataIdentifierType("10.5555/scibase.artifact"), "DOI");
  assert.strictEqual(metadataIdentifierType("analysis.py"), "LocalId");
}

function testDuplicateArtifactIdentityBlocksReadiness() {
  const duplicateIdentity = {
    ...project,
    artifacts: [
      project.artifacts[0],
      {
        ...project.artifacts[1],
        id: project.artifacts[0].id,
        persistentId: project.artifacts[0].persistentId,
      },
    ],
  };
  const result = evaluateArtifactHosting(duplicateIdentity);

  assert.strictEqual(result.hostingReadiness, "blocked");
  assert(result.blockers.includes("artifact_id_duplicate:artifact-cell-counts"));
  assert(result.blockers.includes("artifact_persistent_id_duplicate:10.5555/scibase.cell-counts.v1"));
}

function testMalformedReleaseMetadataBlocksReadiness() {
  const malformed = {
    ...project,
    publicationYear: new Date().getUTCFullYear() + 1,
    artifacts: [
      {
        ...project.artifacts[0],
        access: "publci",
      },
      {
        ...project.artifacts[1],
        id: "",
        name: "",
      },
    ],
  };
  const result = evaluateArtifactHosting(malformed);

  assert.strictEqual(result.hostingReadiness, "blocked");
  assert(result.blockers.includes("artifact_access_invalid:artifact-cell-counts"));
  assert(result.blockers.includes("artifact_id_missing:1"));
  assert(result.blockers.includes("artifact_name_missing:1"));
  assert(result.blockers.includes("project_publication_year_invalid"));
}

function testAmbiguousVersionHistoryBlocksReadiness() {
  const ambiguousHistory = {
    ...project,
    previousArtifacts: [previousDataset, {...previousDataset}],
  };

  assert(
    validateHostingIntegrity(ambiguousHistory).includes(
      "previous_artifact_id_duplicate:artifact-cell-counts",
    ),
  );
  assert.strictEqual(evaluateArtifactHosting(ambiguousHistory).hostingReadiness, "blocked");
}

testTypeDetection();
testManifestBuildsPreviewAndHashes();
testMissingMetadataBlocksReadiness();
testVersionDiffs();
testRuntimeReadiness();
testFullEvaluationExportsMetadata();
testMetadataIdentifierTypes();
testDuplicateArtifactIdentityBlocksReadiness();
testMalformedReleaseMetadataBlocksReadiness();
testAmbiguousVersionHistoryBlocksReadiness();

console.log("scientific-artifact-hosting-governance tests passed");
