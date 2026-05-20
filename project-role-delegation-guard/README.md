# Project Role Delegation Guard

This self-contained slice reviews temporary delegated authority before sensitive project actions such as publication, restricted-data export, archive freeze, and role transfer.

The guard checks sponsor approval, separation of duties, identity posture, object-level scope, and expiry. It produces deterministic reviewer packets so project owners can approve or block delegated actions without relying on ad hoc comments.

## Run locally

```bash
node project-role-delegation-guard/test.js
node project-role-delegation-guard/demo.js
```

Demo outputs are written to `project-role-delegation-guard/demo-output/`.
