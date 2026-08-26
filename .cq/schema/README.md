# CQ Memory Schema

The schema describes metadata for distilled engineering memory. Markdown files remain authoritative; generated indexes are disposable.

Required fields: `id`, `type`, `status`, `updatedAt`.

Recommended fields: `agent`, `commit`, `version`, `title`, `tags`, `references`, `summary`.

V1 records that cannot be safely inferred are marked `legacy`; migration never guesses or overwrites source content.
