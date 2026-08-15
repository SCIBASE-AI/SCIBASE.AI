const crypto = require("crypto");

const EXTENSION_TYPES = {
  csv: "dataset",
  tsv: "dataset",
  json: "dataset",
  parquet: "dataset",
  xlsx: "dataset",
  ipynb: "notebook",
  py: "code",
  r: "code",
  jl: "code",
  png: "figure",
  jpg: "figure",
  jpeg: "figure",
  svg: "figure",
  mp4: "supplement",
  pdf: "document",
  md: "document",
};

const ALLOWED_ACCESS = new Set(["public", "private", "restricted", "embargoed"]);

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function assertArray(name, value) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`);
  }
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (!value) {
      continue;
    }
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates].sort();
}

function validateHostingIntegrity(project) {
  const blockers = [];
  const previousArtifacts = project.previousArtifacts || [];

  assertArray("project.previousArtifacts", previousArtifacts);

  for (const [index, artifact] of project.artifacts.entries()) {
    if (!artifact.id || !String(artifact.id).trim()) {
      blockers.push(`artifact_id_missing:${index}`);
    }
    if (!artifact.name || !String(artifact.name).trim()) {
      blockers.push(`artifact_name_missing:${artifact.id || index}`);
    }
    if (artifact.access && !ALLOWED_ACCESS.has(artifact.access)) {
      blockers.push(`artifact_access_invalid:${artifact.id || index}`);
    }
  }

  for (const id of duplicateValues(project.artifacts.map((artifact) => artifact.id))) {
    blockers.push(`artifact_id_duplicate:${id}`);
  }
  for (const id of duplicateValues(previousArtifacts.map((artifact) => artifact.id))) {
    blockers.push(`previous_artifact_id_duplicate:${id}`);
  }

  const persistentIds = project.artifacts.map((artifact) => artifact.persistentId);
  for (const id of duplicateValues(persistentIds)) {
    blockers.push(`artifact_persistent_id_duplicate:${id}`);
  }
  if (project.persistentId && persistentIds.includes(project.persistentId)) {
    blockers.push(`project_artifact_persistent_id_collision:${project.persistentId}`);
  }

  const currentYear = new Date().getUTCFullYear();
  if (
    !Number.isInteger(project.publicationYear) ||
    project.publicationYear < 1000 ||
    project.publicationYear > currentYear
  ) {
    blockers.push("project_publication_year_invalid");
  }

  return blockers;
}

function getExtension(name) {
  const index = String(name || "").lastIndexOf(".");
  return index === -1 ? "" : name.slice(index + 1).toLowerCase();
}

function detectArtifactType(artifact) {
  if (artifact.type) {
    return artifact.type;
  }

  return EXTENSION_TYPES[getExtension(artifact.name)] || "supplement";
}

function byteSize(content) {
  if (content === undefined || content === null) {
    return 0;
  }

  return Buffer.byteLength(typeof content === "string" ? content : stableStringify(content));
}

function buildPreviewDescriptor(artifact, type) {
  if (type === "dataset" && typeof artifact.content === "string") {
    const rows = artifact.content.trim().split(/\r?\n/).filter(Boolean);
    const header = rows[0] ? rows[0].split(",").map((value) => value.trim()) : [];
    return {
      kind: "table",
      rowCount: Math.max(rows.length - 1, 0),
      columns: header,
    };
  }

  if (type === "notebook") {
    return {
      kind: "notebook",
      renderer: "jupyter",
    };
  }

  if (type === "figure") {
    return {
      kind: "thumbnail",
      renderer: "image",
    };
  }

  if (type === "code") {
    return {
      kind: "source",
      language: artifact.language || getExtension(artifact.name),
    };
  }

  return {
    kind: "download",
  };
}

function validateArtifactMetadata(artifact) {
  const metadata = artifact.metadata || {};
  const missing = [];

  for (const field of ["title", "creators", "description", "keywords"]) {
    if (!metadata[field] || (Array.isArray(metadata[field]) && metadata[field].length === 0)) {
      missing.push(field);
    }
  }

  if (!artifact.license) {
    missing.push("license");
  }

  return {
    ok: missing.length === 0,
    missing,
  };
}

function buildArtifactManifest(project) {
  assertArray("project.artifacts", project.artifacts);

  return project.artifacts.map((artifact) => {
    const type = detectArtifactType(artifact);
    const metadataCheck = validateArtifactMetadata(artifact);

    return {
      id: artifact.id,
      name: artifact.name,
      type,
      version: artifact.version || "1",
      contentHash: sha256({
        name: artifact.name,
        type,
        content: artifact.content,
        metadata: artifact.metadata || {},
      }),
      sizeBytes: byteSize(artifact.content),
      license: artifact.license || null,
      access: artifact.access || "private",
      persistentId: artifact.persistentId || null,
      preview: buildPreviewDescriptor(artifact, type),
      metadataCheck,
    };
  });
}

function diffArtifactVersions(previousArtifact, currentArtifact) {
  const previousType = detectArtifactType(previousArtifact);
  const currentType = detectArtifactType(currentArtifact);
  const previousHash = sha256({
    name: previousArtifact.name,
    type: previousType,
    content: previousArtifact.content,
    metadata: previousArtifact.metadata || {},
  });
  const currentHash = sha256({
    name: currentArtifact.name,
    type: currentType,
    content: currentArtifact.content,
    metadata: currentArtifact.metadata || {},
  });
  const changes = [];

  if (previousHash !== currentHash) {
    changes.push("content_changed");
  }
  if (previousArtifact.license !== currentArtifact.license) {
    changes.push("license_changed");
  }
  if (stableStringify(previousArtifact.metadata || {}) !== stableStringify(currentArtifact.metadata || {})) {
    changes.push("metadata_changed");
  }

  return {
    artifactId: currentArtifact.id,
    previousVersion: previousArtifact.version || "1",
    currentVersion: currentArtifact.version || "1",
    previousHash,
    currentHash,
    changes,
  };
}

function buildVersionDiffs(project) {
  const previousById = new Map((project.previousArtifacts || []).map((artifact) => [artifact.id, artifact]));

  return project.artifacts
    .filter((artifact) => previousById.has(artifact.id))
    .map((artifact) => diffArtifactVersions(previousById.get(artifact.id), artifact));
}

function validateRuntimeEnvironment(environment) {
  const missing = [];

  if (!environment || typeof environment !== "object") {
    return {
      ok: false,
      missing: ["environment"],
      commands: [],
    };
  }

  if (!environment.type) {
    missing.push("type");
  }
  if (!environment.image && !environment.definitionFile) {
    missing.push("image_or_definition_file");
  }
  if (!Array.isArray(environment.commands) || environment.commands.length === 0) {
    missing.push("commands");
  }

  return {
    ok: missing.length === 0,
    missing,
    commands: environment.commands || [],
  };
}

function buildJsonLd(project, manifest) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": project.persistentId || project.id,
    name: project.title,
    description: project.description,
    creator: project.creators,
    keywords: project.keywords || [],
    license: project.license,
    distribution: manifest.map((artifact) => ({
      "@type": "DataDownload",
      identifier: artifact.persistentId || artifact.id,
      name: artifact.name,
      encodingFormat: artifact.type,
      contentUrl: artifact.access === "public" ? `/artifacts/${artifact.id}` : null,
      sha256: artifact.contentHash,
    })),
  };
}

function metadataIdentifierType(identifier) {
  return String(identifier || "").startsWith("10.") ? "DOI" : "LocalId";
}

function buildDataCite(project, manifest) {
  const projectIdentifier = project.persistentId || project.id;

  return {
    identifiers: [{identifier: projectIdentifier, identifierType: metadataIdentifierType(projectIdentifier)}],
    creators: project.creators.map((creator) => ({name: creator})),
    titles: [{title: project.title}],
    publisher: project.publisher || "SCIBASE.AI",
    publicationYear: project.publicationYear,
    resourceType: {resourceTypeGeneral: "Dataset", resourceType: "Scientific artifact package"},
    relatedIdentifiers: manifest.map((artifact) => {
      const artifactIdentifier = artifact.persistentId || artifact.id;

      return {
        relatedIdentifier: artifactIdentifier,
        relatedIdentifierType: metadataIdentifierType(artifactIdentifier),
        relationType: "HasPart",
      };
    }),
  };
}

function scoreFairReadiness(manifest, runtime) {
  const maxScore = 100;
  const metadataMissing = manifest.reduce((sum, artifact) => sum + artifact.metadataCheck.missing.length, 0);
  const privateArtifacts = manifest.filter((artifact) => artifact.access !== "public").length;
  const runtimePenalty = runtime.ok ? 0 : 20;
  const score = maxScore - metadataMissing * 8 - privateArtifacts * 4 - runtimePenalty;

  return Math.max(score, 0);
}

function evaluateArtifactHosting(project) {
  assertArray("project.creators", project.creators);
  assertArray("project.artifacts", project.artifacts);

  const integrityBlockers = validateHostingIntegrity(project);
  const manifest = buildArtifactManifest(project);
  const runtime = validateRuntimeEnvironment(project.executionEnvironment);
  const versionDiffs = buildVersionDiffs(project);
  const blockers = [...integrityBlockers];

  for (const artifact of manifest) {
    if (!artifact.metadataCheck.ok) {
      blockers.push(`artifact_metadata_incomplete:${artifact.id}`);
    }
  }

  if (!runtime.ok) {
    blockers.push("runtime_environment_incomplete");
  }

  if (!project.license) {
    blockers.push("project_license_missing");
  }

  const fairScore = scoreFairReadiness(manifest, runtime);

  return {
    projectId: project.id,
    manifest,
    versionDiffs,
    runtimeReadiness: runtime,
    fairScore,
    hostingReadiness: blockers.length === 0 ? "ready_for_review" : "blocked",
    blockers,
    jsonLd: buildJsonLd(project, manifest),
    dataCite: buildDataCite(project, manifest),
    auditHash: sha256({
      projectId: project.id,
      manifest,
      versionDiffs,
      runtime,
      fairScore,
      blockers,
    }),
  };
}

module.exports = {
  buildArtifactManifest,
  buildDataCite,
  buildJsonLd,
  detectArtifactType,
  diffArtifactVersions,
  evaluateArtifactHosting,
  metadataIdentifierType,
  sha256,
  stableStringify,
  validateHostingIntegrity,
  validateRuntimeEnvironment,
};
