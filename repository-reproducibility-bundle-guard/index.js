const HIGH = "high";
const MEDIUM = "medium";
const LOW = "low";

const REQUIRED_COMPONENT_TYPES = [
  "manuscript",
  "data",
  "code",
  "notebook",
  "results",
  "protocol",
  "metadata",
];

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function array(value, field) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  return value;
}

function unique(values) {
  return [...new Set(values.map(String))];
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isPinnedRuntime(value) {
  return typeof value === "string" && /@sha256:[a-f0-9]{64}$/.test(value);
}

function normalizeComponent(raw, index) {
  return {
    id: requiredString(raw.id, `components[${index}].id`),
    type: requiredString(raw.type, `components[${index}].type`),
    path: requiredString(raw.path, `components[${index}].path`),
    sha256: requiredString(raw.sha256, `components[${index}].sha256`).toLowerCase(),
    bytes: Number(raw.bytes || 0),
    versioned: raw.versioned !== false,
    provenanceRefs: unique(raw.provenanceRefs || []),
    runtimeImage: raw.runtimeImage ? String(raw.runtimeImage) : "",
    lockfiles: unique(raw.lockfiles || []),
    exportTargets: unique(raw.exportTargets || []),
  };
}

function normalizeCandidate(raw) {
  return {
    repositoryId: requiredString(raw.repositoryId, "repositoryId"),
    releaseTag: requiredString(raw.releaseTag, "releaseTag"),
    commit: requiredString(raw.commit, "commit"),
    metadata: {
      doi: raw.metadata && raw.metadata.doi ? String(raw.metadata.doi) : "",
      schemaOrg: Boolean(raw.metadata && raw.metadata.schemaOrg),
      dataCite: Boolean(raw.metadata && raw.metadata.dataCite),
      license: raw.metadata && raw.metadata.license ? String(raw.metadata.license) : "",
      authors: unique((raw.metadata && raw.metadata.authors) || []),
    },
    components: array(raw.components || [], "components").map(normalizeComponent),
    bundle: {
      archivePath: raw.bundle && raw.bundle.archivePath ? String(raw.bundle.archivePath) : "",
      sha256: raw.bundle && raw.bundle.sha256 ? String(raw.bundle.sha256).toLowerCase() : "",
      includes: unique((raw.bundle && raw.bundle.includes) || []),
      generatedAt: raw.bundle && raw.bundle.generatedAt ? String(raw.bundle.generatedAt) : "",
    },
  };
}

function finding(code, severity, sourceId, message, remediation) {
  return { code, severity, sourceId, message, remediation };
}

function assessReproducibilityBundle(rawCandidate) {
  const candidate = normalizeCandidate(rawCandidate);
  const findings = [];
  const componentTypes = new Set(candidate.components.map((item) => item.type));
  const componentPaths = candidate.components.map((item) => item.path);
  const duplicatePaths = componentPaths.filter((path, index) => componentPaths.indexOf(path) !== index);

  for (const type of REQUIRED_COMPONENT_TYPES) {
    if (!componentTypes.has(type)) {
      findings.push(
        finding(
          "MISSING_REQUIRED_COMPONENT",
          HIGH,
          type,
          `${type} component is absent from the release manifest.`,
          "Add the required component or explicitly hold the release until the research packet is complete."
        )
      );
    }
  }

  for (const path of unique(duplicatePaths)) {
    findings.push(
      finding(
        "DUPLICATE_MANIFEST_PATH",
        HIGH,
        path,
        `${path} appears more than once in the release manifest.`,
        "Keep one canonical manifest row per path so rollback and integrity checks are deterministic."
      )
    );
  }

  for (const component of candidate.components) {
    if (!isSha256(component.sha256)) {
      findings.push(
        finding(
          "INVALID_COMPONENT_DIGEST",
          HIGH,
          component.id,
          `${component.path} does not carry a valid SHA-256 digest.`,
          "Record the lowercase SHA-256 digest before tagging the release."
        )
      );
    }

    if (!component.versioned) {
      findings.push(
        finding(
          "UNVERSIONED_COMPONENT",
          HIGH,
          component.id,
          `${component.path} is not marked as version-controlled.`,
          "Commit, tag, or archive the component under repository version control before release."
        )
      );
    }

    if (["code", "notebook"].includes(component.type) && component.lockfiles.length === 0) {
      findings.push(
        finding(
          "MISSING_RUNTIME_LOCKFILE",
          HIGH,
          component.id,
          `${component.path} lacks lockfile evidence for executable reproducibility.`,
          "Attach package-lock, requirements lock, renv, Manifest.toml, or equivalent runtime lock evidence."
        )
      );
    }

    if (["code", "notebook"].includes(component.type) && !isPinnedRuntime(component.runtimeImage)) {
      findings.push(
        finding(
          "UNPINNED_RUNTIME_IMAGE",
          MEDIUM,
          component.id,
          `${component.path} runtime image is not digest-pinned.`,
          "Pin the container/runtime image by immutable digest instead of a mutable tag."
        )
      );
    }

    if (["data", "results"].includes(component.type) && component.provenanceRefs.length === 0) {
      findings.push(
        finding(
          "MISSING_DATA_PROVENANCE",
          MEDIUM,
          component.id,
          `${component.path} lacks provenance references to inputs, instruments, or analysis commits.`,
          "Link the dataset/result to source instruments, upstream datasets, notebooks, or analysis commits."
        )
      );
    }

    if (component.type === "metadata" && component.exportTargets.length === 0) {
      findings.push(
        finding(
          "MISSING_METADATA_EXPORT_TARGETS",
          LOW,
          component.id,
          `${component.path} does not declare export targets.`,
          "Declare DOI, schema.org, DataCite, or repository export targets for discovery."
        )
      );
    }
  }

  if (!candidate.metadata.doi || !candidate.metadata.schemaOrg || !candidate.metadata.dataCite || !candidate.metadata.license) {
    findings.push(
      finding(
        "INCOMPLETE_RELEASE_METADATA",
        HIGH,
        "metadata",
        "Release metadata is missing DOI, schema.org, DataCite, or license evidence.",
        "Complete persistent identifier, discovery metadata, citation metadata, and license fields before publication."
      )
    );
  }

  if (candidate.metadata.authors.length === 0) {
    findings.push(
      finding(
        "MISSING_AUTHOR_ATTRIBUTION",
        MEDIUM,
        "metadata.authors",
        "Release metadata does not include author attribution.",
        "Attach author identifiers before the repository release is exported or assigned a DOI."
      )
    );
  }

  if (!candidate.bundle.archivePath || !isSha256(candidate.bundle.sha256)) {
    findings.push(
      finding(
        "INVALID_EXPORT_BUNDLE",
        HIGH,
        "bundle",
        "Release bundle archive path or digest is missing/invalid.",
        "Generate a release archive with a stable SHA-256 digest before tagging."
      )
    );
  }

  const missingFromBundle = unique(
    candidate.components
      .filter((component) => !candidate.bundle.includes.includes(component.path))
      .map((component) => component.path)
  );
  if (missingFromBundle.length > 0) {
    findings.push(
      finding(
        "BUNDLE_OMITS_MANIFEST_COMPONENTS",
        HIGH,
        "bundle.includes",
        `Release bundle omits manifest paths: ${missingFromBundle.join(", ")}.`,
        "Regenerate the archive so every manifest component is present in the export bundle."
      )
    );
  }

  const high = findings.filter((item) => item.severity === HIGH).length;
  const medium = findings.filter((item) => item.severity === MEDIUM).length;
  return {
    repositoryId: candidate.repositoryId,
    releaseTag: candidate.releaseTag,
    commit: candidate.commit,
    decision: high > 0 ? "hold" : medium > 0 ? "revise" : "release",
    summary: {
      componentsReviewed: candidate.components.length,
      requiredTypesCovered: REQUIRED_COMPONENT_TYPES.filter((type) => componentTypes.has(type)).length,
      bundleEntries: candidate.bundle.includes.length,
      findings: findings.length,
      high,
      medium,
      low: findings.filter((item) => item.severity === LOW).length,
    },
    findings,
    releaseCriteria: [
      "Every required scientific repository component is present in the manifest.",
      "Every manifest entry has a stable digest and version-control status.",
      "Executable code and notebooks include lockfile evidence and pinned runtimes.",
      "Datasets and results link back to provenance inputs.",
      "The export bundle includes every manifest path and has its own SHA-256 digest.",
    ],
  };
}

module.exports = {
  assessReproducibilityBundle,
  normalizeCandidate,
};
