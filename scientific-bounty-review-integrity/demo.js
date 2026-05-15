const {evaluateScientificBounty} = require("./index");
const {challenge, reviews, submission} = require("./sample-data");

const result = evaluateScientificBounty(challenge, submission, reviews);

console.log(JSON.stringify(result, null, 2));
