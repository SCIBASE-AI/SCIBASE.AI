const {evaluateArtifactHosting} = require("./index");
const {project} = require("./sample-data");

const result = evaluateArtifactHosting(project);

console.log(JSON.stringify(result, null, 2));
