const path = require("path");
const { componentPolicy, mergeRequests } = require("./sample-data");
const { evaluateRepositoryChanges, writeReports } = require("./index");

const result = evaluateRepositoryChanges({
  mergeRequests,
  policy: componentPolicy
});

writeReports(result, path.join(__dirname, "reports"));

console.log(JSON.stringify(result.summary, null, 2));
