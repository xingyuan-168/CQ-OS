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

每次完成任务后更新相关条目并关联 commit。写入前先查询现有记忆，避免重复和日志膨胀。结构化/宿主级存储属于 B5。
