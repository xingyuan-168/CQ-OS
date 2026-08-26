# CQ Memory Index Template

`.cq/` Markdown remains the authority. The optional `index.json` is derived and can be deleted and rebuilt. Full text search uses DSH native grep/glob; no external database is required in V2.1 baseline.

The rebuild helper scans Markdown, extracts front matter, emits stable `id/type/status/agent/commit/version/title/tags/updatedAt/path/hash` records, and reports legacy, duplicate, and missing-commit records without changing source files.

`better-sqlite3` and DSH SQLite/FTS5 are only future enhancements when the zero-dependency index and grep approach demonstrably fail the query/performance acceptance tests.
