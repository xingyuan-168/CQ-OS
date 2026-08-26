# Technical Debt

## V2 Research Status

- V2 开源优先原则已纳入 `docs/v2-plan.md`。
- V2.0 治理调研完成：首选复用 DSH 原生 guard、pre-execute、fs intent、approval、sandboxPolicy 和 subagent 生命周期；OPA/Cedar/Casbin/Cerbos 暂为二开备选。
- V2.0 原生 PoC：`tools/pre-execute` 拒绝已成功；`ctx.tools.guard()` 与 Inspect 契约不一致，需定位正确 owner/注入方式。
- V2.0 下一步必须完成兼容性定位、文件 intent/approval/subagent 事件 PoC 和 ADR；未完成前不得引入第三方策略依赖或声明硬 RBAC 已实现。

## Deferred

- B1: 稳定后评估关闭日常 Cordis 自修改能力，仅维护/升级状态启用。
- B2: CQ Governance Plugin，硬策略和路径级 RBAC。
- B3: 第三方插件标准。
- B4: 动态模型路由，并核验子 Agent 实际请求模型。
- B5: 宿主级或结构化 Memory 存储。
