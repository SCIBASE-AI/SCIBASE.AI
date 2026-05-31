# Branch Protection Drift Guard Report

Repository: project-repo-neuro-77
Decision: block-release-export

| Severity | Finding | Action |
| --- | --- | --- |
| block | Release branch release/v1.2-dataset is missing required status checks. | Restore the required release status checks before citation or export actions. |
| hold | Release branch release/v1.2-dataset requires fewer than 2 approving reviews. | Reset branch protection to the project release-review baseline. |
| hold | Release branch release/v1.2-dataset does not require signed commits. | Require signed commits or attach a release-manager exception. |
| block | Release branch release/v1.2-dataset allows force pushes or deletion. | Disable destructive branch settings before release or export. |
| hold | Release branch release/v1.2-dataset allows admin bypass without an exception record. | Attach the exception record or disable admin bypass. |
| block | Export bundle export-v1.2 is marked ready while branch release/v1.2-dataset has protection drift. | Hold export until branch protection drift is resolved. |
