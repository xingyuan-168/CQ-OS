# CQ Memory

CQ Memory 保存项目工程知识，不复制聊天记录或原始 Agent 运行日志。默认存储在当前项目仓库 `.cq/` 并随 Git 版本化。

## 目录

- `project.md`:目标、背景、需求、限制
- `decisions/ADR-*.md`:选型、原因、放弃方案、长期影响
- `progress.md`:已完成、当前、未完成、问题
- `executions/`:每项任务一份提炼摘要，包含 Agent、做了什么、为什么、结果、关联 commit
- `bugs.md`:历史 Bug、原因、修复和预防
- `preferences.md`:用户偏好与项目规则
- `tech-debt.md`:临时方案、未完成重构、已知问题、老旧依赖和后置任务
- `versions/`:版本目标、修改、影响、测试和发布记录
- `selfcheck/`:各角色真实自检报告（工具/权限/职能的只读实测），属验证证据，可随 Git 保留但不膨胀
- `review/`:Review 验收结论（通过/不通过、缺陷、风险、建议），由 Core 落盘并关联 commit

每次完成任务后更新相关条目并关联 commit。写入前先查询现有记忆，避免重复和日志膨胀。结构化/宿主级存储属于 B5。

## 元数据 schema（新写入必须符合）

每条记忆文件使用统一 front matter 头部字段：`id`、`type`、`status`、`updatedAt`。可选：`agent`、`commit`、`version`、`title`、`tags`。

允许的 `type`：`project`、`decision`、`progress`、`execution-summary`、`bug`、`preference`、`tech-debt`、`version`。

`status` 取值：`active`、`done`、`accepted`、`deferred`、`legacy` 等；无法推断时标记 `legacy`，不猜测。

派生索引 `.cq/index.json` 可删除并从 Markdown 重建。全文检索用 DSH 原生 grep/glob，不引入数据库。

## 一次性迁移规则

旧 Markdown 保留正文，只增量补 front matter，不删除、不覆盖源文件：

1. 为每条现有记忆文件加统一头部字段（id/type/status/updatedAt）。
2. 无法安全推断的字段标记 `legacy`，不猜测状态。
3. 重建 `.cq/index.json`。
4. 保持 Git 历史连续，迁移作为一次 commit。

目标：新写入完全符合 schema；历史记录允许保留少量 `legacy`/`missing-commit` 标记。
