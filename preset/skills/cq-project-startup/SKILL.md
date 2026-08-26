# CQ Project Startup

新项目禁止需求确认后直接开发，必须执行五阶段：

1. Product 做需求分析、范围、约束和验收标准。
2. Research 调研 GitHub、行业成熟方案、官方生态和类似产品，记录调研项目、选择原因、放弃原因和最终方案。
3. Architect 输出技术决策和 ADR，说明影响、替代方案和长期影响。
4. UX/UI/Architect 完成流程、界面和系统设计。
5. 只有设计确认后，Core 才能委派 Developer 开发；开发后必须 Tester 和 Review 验证。

`templates/workflows/` 中的 JavaScript 是工作流模板资产，不会被 DSH 自动扫描或注册。Core 读取模板内容后，将脚本作为参数传给原生 workflow 工具。`phase()` 只做进度分组，不是门禁。

## 前端项目

前端需求必须经过需求分析、交互原型、UI 设计、用户确认、前端开发。UX/UI 阶段结束后 workflow 返回 Core；Core 调用 `ask_user_question`，用户未确认时不得委派 Developer 或产生代码修改。Gate B 使用独立的小型前端模拟项目验收。
