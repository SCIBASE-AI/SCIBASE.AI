function isExpired(date, releaseDate) {
  return new Date(date).getTime() <= new Date(releaseDate).getTime();
}

function evaluateAsset(asset, releaseDate) {
  const findings = [];
  const expired = isExpired(asset.embargoUntil, releaseDate);
  const hasPublicAccess = asset.accessGroups.includes("public");

  if (!expired && !asset.exception) findings.push(`embargo active until ${asset.embargoUntil}`);
  if (!expired && hasPublicAccess && !asset.exception) findings.push("public access group assigned before embargo expiry");
  if (expired && !hasPublicAccess && !asset.exception) findings.push("expired embargo still lacks public access group");
  if (asset.doiTarget !== asset.exportTarget) findings.push("DOI target does not match export bundle target");
  if (expired && !asset.citationVisible) findings.push("citation badge hidden after embargo expiry");
  if (asset.exception && !asset.accessGroups.includes(asset.exception)) findings.push(`exception group ${asset.exception} is missing`);

  const decision = findings.length === 0 ? "release-ready" : "hold-release";
  const actions = decision === "release-ready"
    ? ["include asset in tagged release", "publish citation/export metadata"]
    : ["hold asset from public release", "repair embargo metadata", "exclude from export bundle until clean"];

  return {
    id: asset.id,
    path: asset.path,
    kind: asset.kind,
    decision,
    findings,
    actions
  };
}

function evaluateBatch(batch) {
  const assets = batch.assets.map((asset) => evaluateAsset(asset, batch.releaseDate));
  const summary = assets.reduce((acc, asset) => {
    acc.total += 1;
    acc[asset.decision] = (acc[asset.decision] || 0) + 1;
    acc.findingCount += asset.findings.length;
    return acc;
  }, { total: 0, findingCount: 0 });
  return { batchId: batch.id, generatedAt: batch.generatedAt, releaseDate: batch.releaseDate, summary, assets };
}

module.exports = { evaluateAsset, evaluateBatch };
