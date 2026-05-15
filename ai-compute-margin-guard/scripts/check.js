import fs from "node:fs"

const requiredFiles = [
  "README.md",
  "data/sample-workspace.json",
  "docs/requirement-map.md",
  "scripts/demo.js",
  "src/compute-margin-guard.js",
  "test/compute-margin-guard.test.js"
]

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`)
  }
}

const source = fs.readFileSync("src/compute-margin-guard.js", "utf8")
const bannedPatterns = [/eval\s*\(/, /localStorage/, /sessionStorage/, /process\.env/, /fetch\s*\(/]
for (const pattern of bannedPatterns) {
  if (pattern.test(source)) {
    throw new Error(`Unexpected live integration or unsafe pattern: ${pattern}`)
  }
}

const sample = JSON.parse(fs.readFileSync("data/sample-workspace.json", "utf8"))
for (const section of ["plans", "providerSkus", "priceBook", "accounts", "jobs"]) {
  if (!Array.isArray(sample[section]) || sample[section].length === 0) {
    throw new Error(`Sample workspace missing populated ${section}`)
  }
}

console.log("Module integrity check passed")
