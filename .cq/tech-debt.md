# Technical Debt

## V2 Research Status

- V2 开源优先原则已纳入 `docs/v2-plan.md`。
- V2.0 治理调研完成：首选复用 DSH 原生 guard、pre-execute、fs intent、approval、sandboxPolicy 和 subagent 生命周期；OPA/Cedar/Casbin/Cerbos 暂为二开备选。
- V2.0 原生 PoC：`tools/pre-execute` 拒绝已成功；通过 `ctx.get('tools')` 的第二次 `tools.guard()` 探测仍失败，当前动态 Package 不纳入该 API。
- V2.0 `fs/write-intent` 动态 PoC 未通过：listener 未覆盖动态工具，且工具 cwd 落在 `C:\\Users\\84700`；该事件返回 `undefined` 会继续写入，不能作为 deny。正式路径级控制必须验证 Agent-scoped fs provider 或在工具派发前拒绝。
- V2.0 下一步必须完成 Agent-scoped 接入、approval/subagent 事件 PoC 和 ADR；未完成前不得引入第三方策略依赖或声明硬 RBAC 已实现。

## Deferred

- B1: 稳定后评估关闭日常 Cordis 自修改能力，仅维护/升级状态启用。
- B2: CQ Governance Plugin，硬策略和路径级 RBAC。
- B3: 第三方插件标准。
- B4: 动态模型路由，并核验子 Agent 实际请求模型。
- B5: 宿主级或结构化 Memory 存储。
