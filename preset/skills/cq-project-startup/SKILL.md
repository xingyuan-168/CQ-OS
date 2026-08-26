# CQ Project Startup

新项目禁止需求确认后直接开发，必须执行五阶段：

1. Product 做需求分析、范围、约束和验收标准。
2. Research 调研 GitHub、行业成熟方案、官方生态和类似产品，记录调研项目、选择原因、放弃原因和最终方案。

### Research 开源评估字段（每个候选都必须完整记录）

按开源优先规则，任何新项目/新子系统在决策前必须形成可用的开源评估，禁止只写“找到 MetaGPT/OpenHands”。每个候选至少记录：

- 项目名称
- 项目网址
- 官方仓库地址
- License（是否为商用/持久集成接受）
- 最近活跃情况
- 社区/维护状态（核心维护者、维护连续性）
- 技术栈
- 与当前需求匹配度
- 可以直接复用什么
- 可以二开什么
- 只能借鉴什么
- 二开成本
- 长期维护风险
- 同类型项目对比
- 选择它的原因
- 不选其他候选的原因
- 最终结论：复用 / 二开 / 组合 / 自研

只有评估字段完整、并附许可证与安全初筛后，才允许进入技术决策。
3. Architect 输出技术决策和 ADR，说明影响、替代方案和长期影响。
4. UX/UI/Architect 完成流程、界面和系统设计。
5. 只有设计确认后，Core 才能委派 Developer 开发；开发后必须 Tester 和 Review 验证。

`templates/workflows/` 中的 JavaScript 是工作流模板资产，不会被 DSH 自动扫描或注册。Core 读取模板内容后，将脚本作为参数传给原生 workflow 工具。`phase()` 只做进度分组，不是门禁。

## Workflow 定位（关键）

关键治理流程**不得**由 Workflow 直接 `agent(...)` 创建匿名 Agent。需求分析、开源调研、架构设计、开发、测试、审查必须由 Core 调度 9 个正式角色（`subagent_product`、`subagent_research`、`subagent_architect`、`subagent_developer`、`subagent_tester`、`subagent_review` 等）执行，以继承 persona、toolFilter、`maxDepth: 1`、职责与调度限制。

Workflow 仅用于：并行调研、批量分析、非治理关键路径、后续优化型编排。若在 Workflow 中保留 `agent(...)`，其产物不是正式角色，不承载角色治理。

如果保留任何 Workflow，必须显式把前序结构化结果传入后续阶段：下一阶段 prompt 直接嵌入上一阶段的 JSON 结果，禁止依赖隐式共享上下文或只用“基于上一步”的文字描述。

## 前端项目

前端需求必须经过需求分析、交互原型、UI 设计、用户确认、前端开发。UX/UI 阶段结束后 workflow 返回 Core；Core 调用 `ask_user_question`，用户未确认时不得委派 Developer 或产生代码修改。Gate B 使用独立的小型前端模拟项目验收。
