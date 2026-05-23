const assert = require("node:assert/strict")
const { evaluateObjectPermissionInheritanceDrift } = require("./index")
const { projects, policy } = require("./sample-data")

const packet = evaluateObjectPermissionInheritanceDrift({
  asOf: "2026-05-23T21:50:00.000Z",
  projects,
  policy,
})

assert.equal(packet.summary.totalProjects, 2)
assert.equal(packet.summary.readyProjects, 1)
assert.equal(packet.summary.blockedProjects, 1)
assert.equal(packet.summary.totalObjects, 5)
assert.equal(packet.summary.sensitiveObjects, 4)
assert.equal(packet.readyQueue.length, 1)
assert.equal(packet.readyQueue[0].projectId, "materials-open-methods")

const blocked = packet.projects.find((project) => project.projectId === "oncology-collab")
assert.equal(blocked.status, "permission_change_blocked")
assert(blocked.findings.some((finding) => finding.code === "inherited_grant_overexposure"))
assert(blocked.findings.some((finding) => finding.code === "stale_object_override"))
assert(blocked.findings.some((finding) => finding.code === "data_steward_approval_present"))
assert(blocked.findings.some((finding) => finding.code === "object_override_completeness"))

const dataset = blocked.objects.find((object) => object.objectId === "dataset-rna-human")
const datasetExposure = dataset.findings.find((finding) => finding.code === "inherited_grant_overexposure")
assert(datasetExposure.evidence.exposures.some((exposure) => exposure.action === "download"))
const datasetApproval = dataset.findings.find((finding) => finding.code === "data_steward_approval_present")
assert.deepEqual(datasetApproval.evidence.missingApprovals.map((item) => item.changeId), ["change-dataset-download-ben"])

const reviewThread = blocked.objects.find((object) => object.objectId === "thread-blinded-review")
assert(reviewThread.findings.some((finding) => finding.code === "stale_object_override"))
assert(reviewThread.findings.some((finding) => finding.code === "inherited_grant_overexposure"))

const ready = packet.projects.find((project) => project.projectId === "materials-open-methods")
assert.equal(ready.status, "permission_change_ready")
assert.equal(ready.findings.length, 0)

const repeated = evaluateObjectPermissionInheritanceDrift({
  asOf: "2026-05-23T21:50:00.000Z",
  projects,
  policy,
})
assert.equal(repeated.audit.digest, packet.audit.digest)

console.log("object permission inheritance drift guard tests passed")
