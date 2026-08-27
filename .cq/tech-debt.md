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
- **V2.0 阶段1 突破**：`tools.guard()` 在**正式 cq-os agent scope** 可用（`agents.create` + `setup` 挂载 cq-os 后，`agentCtx.get('tools').guard` 为 function，注册成功无报错）；`fs` 服务在 cq-os scope 存在。关闭 ADR-0020 "guard 正确 owner 待定位" 阻塞项。
- **V2.0 阶段5 进展**：`.cq/policy/` 基准结构（policy/roles/protected-paths/gates）+ `tools/cq-policy.mjs` fail-closed 校验器 + `tools/test-cq-policy.mjs` 已落地并提交（842ea57）。
- **V2.2 阶段3 进展**：`.cq/routemap.yml` 模型路由映射声明 + `tools/cq-routemap.mjs` 结构性校验器 + 测试已落地并提交（97f2f01）；真实模型池依赖 DSH settings（非 CQ OS 源码）。
- **V2.3 阶段4 进展**：`tools/test-cq-plugin-e2e.mjs` 端到端（validate+compose+host-plane 拒绝）已落地（4b18cd1）；真实挂载验证确认 cq-os 组合在真实 cq-os agent scope `standingKeyFor` 通过、`composed=cq-os`。
- **Governance 正式接入 PoC（步骤1）**：standing + Core 两层 guard 拦截验证通过（guard 在真实 cq-os agent scope 注册成功，preset/policy/env/credentials/dsh 受保护路径全命中 deny，src/docs 放行）；spawned 角色层由 `tools.guard` 的 agent-chain 语义（`guardReason` 沿 exec.agent 链查）保证，端到端留到步骤 5 对抗测试；DSH CLI 有官方 `dsh plugin --profile` 依赖管理机制（步骤 3 实测 bare package resolution）。

## Deferred

- B1: 稳定后评估关闭日常 Cordis 自修改能力，仅维护/升级状态启用。
- B2: CQ Governance Plugin，硬策略和路径级 RBAC。
- B3: 第三方插件标准。
- B4: 动态模型路由，并核验子 Agent 实际请求模型。
- B5: 宿主级或结构化 Memory 存储。
