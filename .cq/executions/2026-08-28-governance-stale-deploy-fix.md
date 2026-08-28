---
id: exec-2026-08-28-governance-stale-deploy-fix
type: execution-summary
status: done
updatedAt: 2026-08-28T08:25:00+08:00
commit: 61220705749c7204ec23e874ae8877f8d74d9748
title: 修复 @cq/governance 挂载失败（web 部署过期）
tags: [governance, deploy, bugfix]
---

# 修复 @cq/governance 挂载失败（web 部署过期）

## 任务目标
诊断并修复 `@cq/governance` 在 web profile 挂载时报 `Cannot read properties of undefined (reading 'validate')`。

## 诊断（用户设定了 10 次调用预算，全部命中）
1. workspace 源 `preset/plugins/cq-governance/lib/index.js` 是正确版本：`Config = z.object({...})`，导出 `name/Config/apply`。
2. DSH 自带 `@deepseek-ai/schemastery@3.18.1` 的 Schema **原生自带** `~standard` 品牌（`~standard.validate` 为 function，`toStandard` 不存在）——排除"需要 toStandard 包装"与"多副本 schemastery 不兼容"。
3. 双 profile 的 node_modules 顶层只有 `.pnpm` 与 `@cq`，裸导入向上解析到 DSH 自身 schemastery（与 Cordis 共用一份，无双副本）。
4. **根因**：web 部署副本过期——`lib/index.js` 为旧版 `export const Config = { mode: 'runtime' }`（普通对象），运行时实测 `Config['~standard']` 为 undefined → 与报错精确吻合。desktop 副本与源一致且形态正确（证明 exports/ESM 链路无问题）。
5. 部署链路：profile `package.json` 以 `file:%LOCALAPPDATA%\Temp\cq-governance` 为源（pnpm nodeLinker: hoisted → 直接拷贝进 node_modules）；旧代码留在暂存目录，profile 未重装。

## 做了什么
- 将 workspace 源 `preset/plugins/cq-governance/{package.json,lib/}` 重新部署覆盖 web profile 的 `node_modules\@cq\governance` **与** 暂存目录 `%LOCALAPPDATA%\Temp\cq-governance`（经审批栈 Human Approval 完成工作区外写入）。
- 运行时验证（node 动态 import 部署模块）：`keys: Config,apply,name`；`typeof Config === 'function'`；`Config['~standard'].validate` 为 function；`validate({mode:'runtime'})` 返回默认值；非法 mode 返回 issues 数组。
- 部署前后哈希对齐：源/desktop/新 web 均为 `016B94…`（旧 web 为 `B3361F…`）。

## 变更文件
- 部署产物（非源码）：`C:\Users\84700\.dsh\profiles\web\node_modules\@cq\governance\{package.json,lib\index.js}`、`C:\Users\84700\AppData\Local\Temp\cq-governance\{package.json,lib\index.js}`
- 记忆：`.cq/bugs.md`（BUG-0001）、本文件
- workspace 源码无变更（修复 commit `6122070` 已包含 zod Config）；无新 commit。

## 测试
- node 单行运行时验证全部通过（见上）。
- desktop profile 同源副本此前已正常挂载，作为对照。

## 已知问题 / 遗留
- 尚未在真实会话重新挂载验证（需要重载 web 会话/重启 profile，ESM 缓存会保留旧模块直到进程重启）。
- `.agent-presets\cq-os\skills\cq-governance`（skills 用途副本）未比对，属于另一条部署链，本次未动。
- 挂载该插件的行位于会话/UI 层面（preset 与 profile cordis.yml 均无该行），重载后若仍有问题，从 plugin inventory 侧确认行状态。

## 后续
- 用户重载 web 会话确认 loader 错误消失、`tools.guard` 生效。
- 建议把"部署后 node 单行验证"纳入 maintenance preset 的 standingKeyFor 流程。
