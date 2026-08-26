---
id: tech-debt
type: tech-debt
status: open
updatedAt: 2026-08-26T14:32:31+08:00
commit: a530bf346b82576cd86bc6e9a16c3026fe95c1e5
title: Technical Debt
---

# Technical Debt

## V2 Research Status

- V2 开源优先原则已纳入 `docs/v2-plan.md`。
- V2.0 治理调研完成：首选复用 DSH 原生 guard、pre-execute、fs intent、approval、sandboxPolicy 和 subagent 生命周期；OPA/Cedar/Casbin/Cerbos 暂为二开备选。
- V2.0 PoC 实测结论：`tools/pre-execute` 是当前唯一可用、可重入的工具级硬拦截；`tools.guard()` 在动态 Package 实例缺失（`ctx.get('tools')` 无该方法）；`fs/write-intent` 返回 `undefined` 即继续写入且动态 listener 未覆盖；approval 缺 answerer fail-closed（`unavailable`），但动态 Host 无 `AbortController` 无法实测调用。
- V2.0 ADR-0020 已签署为“首期复用 `tools/pre-execute`，不引入第三方策略引擎”。Agent-scoped guard、ask 审批、正式 Agent-scoped fs intent 和 subagent 委派状态仍需维护预设阶段验证；未完成前不得声明硬 RBAC 已实现。

## Deferred

- B1: 稳定后评估关闭日常 Cordis 自修改能力，仅维护/升级状态启用。
- B2: CQ Governance Plugin，硬策略和路径级 RBAC。
- B3: 第三方插件标准。
- B4: 动态模型路由，并核验子 Agent 实际请求模型。
- B5: 宿主级或结构化 Memory 存储。
