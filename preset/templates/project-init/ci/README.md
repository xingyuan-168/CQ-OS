# CI template

- GitHub Actions: `ci/.github/workflows/ci.yml` — minimal install + test + best-effort security scan.
- Add provider-specific files as needed: `gitlab-ci.yml`, `Jenkinsfile`, etc.
- At minimum a CI pipeline should run lint, tests, and a build/typecheck.
