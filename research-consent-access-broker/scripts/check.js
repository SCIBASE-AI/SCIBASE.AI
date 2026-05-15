import fs from "node:fs"

const requiredFiles = [
  "README.md",
  "data/sample-workspace.json",
  "docs/requirement-map.md",
  "src/consent-access-broker.js",
  "test/consent-access-broker.test.js",
]

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`)
  }
}

const source = fs.readFileSync("src/consent-access-broker.js", "utf8")
for (const token of ["eval(", "localStorage", "sessionStorage", "process.env"]) {
  if (source.includes(token)) {
    throw new Error(`Unsafe or credential-dependent token found: ${token}`)
  }
}

const sample = JSON.parse(fs.readFileSync("data/sample-workspace.json", "utf8"))
if (!sample.researchers?.length || !sample.projects?.length || !sample.objects?.length) {
  throw new Error("Sample workspace must include researchers, projects, and objects")
}

console.log("Module integrity check passed")
