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

角色工具使用硬 `toolFilter` 禁止 `subagent`、`subagent_fork`、`workflow`、`ralph`、团队控制工具、其他角色工具和 Cordis 自修改工具。Core 收集结果后再调度下一个角色。角色之间不得直接通信或创建子 Agent。

每次委派必须说明目标、上下文、允许修改范围、交付格式和验收标准。Core 用结果摘要更新 `.cq/executions/`，不保存原始聊天日志。
