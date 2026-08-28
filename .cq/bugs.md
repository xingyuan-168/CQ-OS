---
id: bugs
type: bug
status: open
updatedAt: 2026-08-28T08:25:00+08:00
commit: 61220705749c7204ec23e874ae8877f8d74d9748
title: Bug 经验库
---

# Bug 经验库

记录历史 Bug、原因、修复方案与防复发方法。每个 Bug 条目应包含：现象、根因、修复 commit、验证、防复发。

## BUG-0001 @cq/governance 挂载报 "Cannot read properties of undefined (reading 'validate')"

- **现象**：web profile 挂载 `@cq/governance` 时 Cordis loader 报 `Cannot read properties of undefined (reading 'validate')`。
- **根因**：web profile 的部署产物过期。`C:\Users\84700\.dsh\profiles\web\node_modules\@cq\governance\lib\index.js` 仍是旧版 `export const Config = { mode: 'runtime' }`（普通对象，无 Standard Schema 的 `~standard` 品牌），Cordis 对 `plugin.Config['~standard'].validate` 的访问落到 undefined。DSH 自带 `@deepseek-ai/schemastery@3.18.1` 的 `z.object({...})` 原生带 `~standard.validate`，无需 `toStandard()`；同形态在 desktop profile 正常挂载，证明问题只在 web 部署副本。
- **修复**：workspace 源 `preset/plugins/cq-governance/lib/index.js`（zod 化 Config，commit `6122070`）早已正确；将源重新部署覆盖 web profile 的 `node_modules\@cq\governance` 及 `file:` 依赖暂存目录 `%LOCALAPPDATA%\Temp\cq-governance`（profile package.json 以 `file:` 引用该目录，nodeLinker: hoisted 直接拷贝）。哈希 `016B94…` 前后对齐，运行时验证 `~standard.validate` 为 function、`validate({mode:'runtime'})` 返回默认值、非法 mode 返回 issues。
- **防复发**：`preset/` 每次 commit 后必须重新部署到所有 profile（web + desktop）再验证；部署后跑 node 单行验证（keys 含 name/Config/apply，`typeof Config['~standard']?.validate === 'function'`）。`.dsh` 部署产物与 Temp 暂存目录都要刷新，否则 profile 下次 `pnpm install` 会回退旧代码。
