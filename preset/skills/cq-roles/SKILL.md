# CQ Roles

CQ Core 是唯一组织者，负责项目管理、调度、流程控制、门禁和验收。专业角色只执行 Core 分配的任务，统一 `maxDepth: 1`，不得再组队。

## 角色

- Product：需求分析与产品拆解
- Research：开源和技术调研
- UX：用户流程与交互
- UI：视觉规范与组件设计
- Architect：架构、技术选型和数据库
- Developer：代码实现与修复
- Tester：测试设计与质量验证
- DevOps：环境、Docker、CI/CD 和部署
- Review：只读审查质量、安全、性能和一致性

角色工具使用硬 `toolFilter` 禁止 `subagent`、`subagent_fork`、`workflow`、`ralph`、团队控制工具、其他角色工具。Core 收集结果后再调度下一个角色。角色之间不得直接通信或创建子 Agent。

## 调度规则

关键治理流程必须由 Core 调用正式角色执行：Product、Research、UX、UI、Architect、Developer、Tester、Review、DevOps。不得用 Workflow 的 `agent(...)` 创建匿名 Agent 替代正式角色。Workflow 仅用于并行调研、批量分析、非治理关键路径。

每次委派必须说明目标、上下文、允许修改范围、交付格式和验收标准。Core 用结果摘要更新 `.cq/executions/`，不保存原始聊天日志。

## Review 结论落盘

Review 为纯只读角色（`allow: [read, glob, grep, skill, web_search]`），无 `write`/`edit`/`pwsh`，其验收结论只能经 `report` 返回 Core。为让质量门禁结论持久化、可被后续阶段查询并在 Git 中留痕：

- Review 将验收结论（通过/不通过、缺陷、风险、改进建议）经 `report` 上报 Core。
- Core 收到后，把结论写入 `.cq/review/`（每轮验收一个文件），并关联对应 commit。
- 约定文件名含角色、目标与 commit，便于追溯。

Review 无须也不应获得 `write` 等写入工具；落盘是 Core 的职责。
