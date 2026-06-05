function validateReproducibility(payload) {
  const result = {
    valid: true,
    issues: []
  };

  if (!payload || !payload.manifest || !payload.manifest.dependencies) {
    result.valid = false;
    result.issues.push("Missing manifest or dependencies in payload.");
    return result;
  }

  const dependencies = payload.manifest.dependencies;
  
  for (const [pkg, version] of Object.entries(dependencies)) {
    if (version.startsWith('^') || version.startsWith('~') || version.startsWith('>') || version.startsWith('<') || version === '*') {
      result.valid = false;
      result.issues.push(`Non-deterministic version found for package '${pkg}': ${version}`);
    }
  }

  return result;
}

module.exports = {
  validateReproducibility
};
