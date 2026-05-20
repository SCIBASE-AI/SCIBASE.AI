# Requirements Map

| Issue #16 Requirement | Implementation Evidence |
| --- | --- |
| Reproducibility checker auto-executes code/notebooks in sandbox environments | `sample-data.js` models repeated sandbox runs with commit, environment hash, dataset hash, exit code, and output artifacts. |
| Verifies output consistency with reported results | `evaluateOutputAgreement()` detects output artifact hash drift across repeated runs. |
| Verifies dependency/version integrity | `evaluateEnvironmentAndData()` and `evaluateFlakinessSignals()` flag environment drift and unpinned dependencies. |
| Verifies presence of raw data, clean pipelines, and test sets | Dataset hashes are checked across runs and drift blocks reproducibility confidence. |
| Flags discrepancies or non-determinism | The assistant flags unseeded randomness, wall-clock reads, network dependencies, output drift, failed runs, and prior failed reproduction attempts. |
| Assigns reproducibility confidence score | `evaluateProject()` assigns confidence per project based on decision severity. |
| Links previous reproducibility attempts | Prior passed/failed attempts are part of each project and can downgrade or block the decision. |
| Structured review suggestions before release | `authorActions` and `assistantTasks` produce reviewer-ready remediation packets. |
| Reviewer-ready proof | `test.js` covers stable runs, controls, output drift, environment drift, network dependency, prior failures, run-root mismatch, and combined summary behavior. |
