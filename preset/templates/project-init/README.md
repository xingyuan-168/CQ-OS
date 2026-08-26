# CQ Project Initialization Template

A new project should be initialized with:

- `src/` or the project-specific source directory
- `tests/`
- `docs/`
- `.cq/`
- `.gitignore`
- `README.md`
- `CHANGELOG.md`
- Docker and CI configuration when the project requires them

This template ships reusable skeletons:

- `.gitignore.template`
- `Dockerfile.template`
- `docker-compose.yml.template`
- `docs/` (documentation root)
- `ci/` (CI pipeline placeholder)

Copy and adapt these to the project stack. The first pass is a generic skeleton only;
do not generate dozens of language-specific templates.

Initialize Git before implementation. Do not create v1/v2/v3 source copies or manual snapshots.
