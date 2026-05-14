import { validateArtifactManifest } from "./artifact-validator.js";
import { sampleManifest } from "./sample-manifest.js";

const report = validateArtifactManifest(sampleManifest);

console.log(JSON.stringify(report, null, 2));
