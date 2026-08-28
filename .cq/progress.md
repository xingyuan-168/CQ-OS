---
id: progress
type: progress
status: active
updatedAt: 2026-08-27T08:49:35+08:00
commit: 1c3a77997638984b7152273030f2a7c8a8b5e25b
title: Progress
---

# Progress

## Completed

- 需求基线已读取并完成 DSH 扩展点调研。
- Git 仓库初始化，远端配置为 `git@github.com:xingyuan-168/CQ-OS.git`。
- CQ OS 预设源码目录建立。
- 组合文件、技能和工作流模板已完成。
- 已通过官方 AgentPresets API 创建用户预设。
- `standingKeyFor('cq-os')` 真挂载验证成功。
- Git commit、`v0.1.0` tag 和 GitHub 远端推送完成。
- 狗粮课题：CQ Memory schema 一次性迁移完成（五阶段治理 + Human Gate + Review 落盘 + Git v0.2.0 闭环）。
- DSH 部署配置（`~/.dsh/settings.yaml`，非 Git 跟踪）：`llm-pi-ai.providers.hs`（火山方舟 Agent Plan，`https://ark.cn-beijing.volces.com/api/plan/v3`，凭据 `HS_API_KEY`）已配置 DeepSeek V4 Flash 与 V4 Pro 两个模型（1M 上下文/384K 输出，推理档位 off/high/max，deepseek 方言 compat），供模型选择器选用；默认路由未改动。

## V1 Status

- V1 源码、部署、`standingKeyFor('cq-os')` 真挂载和 Git v0.1.0 已完成。
- 已完成 P0–P2 收口修复：清理 8 角色 toolFilter 死名、修正 Workflow 绕过角色与结果传递、补失败恢复规则、补 Research 开源评估字段、Memory schema 迁移规则、project-init 骨架、统一 Cordis 自修改描述、校正 V2 进度标记。
- 新增死名扫描回归防护 `tools/check-toolfilter-deadnames.mjs`（`agent.cordis.yml` 扫描为 `dead: []`）。
- **Governance Runtime（ADR-0025 + V2）**：LOOP_BREAKER 规则层；@cq/governance 双钩子（guard 单调 deny + pre-execute allow/deny/ask）；fail-closed 三态；shell 保守字面匹配；maintenance 模式；模块拆分（policy/roles/core 零依赖）；cq-os 与 cq-os-maint 接入 governance 行；tester deny write/edit、4 角色 deny bash；gates 增 dangerous-ops/governance-rule-change。
- **V2 收口（本轮）**：P0-1 guard 缺失 fail-closed throw；P0-2 policy 绑定 exec.agent.session.header.cwd（per-root 缓存，非 process.cwd）；P0-4 roleRegistry 真接线（observeSpawn + subagent/start info.id 关联）；P0-5 BASELINE_ROLES 含 core；P0-6 effectiveRoles 单调收紧；P0-7 effectiveGates 单调；P0-8 loadPolicy 消费 policy.yml；P0-3 canonical Layer 2（canonicalGuard）。测试 16 项 + 回归 10/10 全绿。源 review 见 `docs/reviews/CQ_OS_当前阶段修复清单_Governance_Maintenance_V2.md`。
- **P0-3 canonical FS Layer 2 已实现（partial）**：async `canonicalGuard` pre-execute 监听，经 `ctx.fs.resolve` realpath 校验 workspace 锚定受保护根（preset/.cq/policy/.dsh），拦截 absolute/traversal/symlink；.env/credentials 仍由 Layer 1；A2 shell 残余对抗项标 BLOCKED。
- **P4 用户实测（2026-08-28）**：按 `docs/p4-user-validation-checklist.md` 在真实 GUI 会话整体执行完毕并如实记录 → **Hard Governance = PARTIAL（未 VERIFIED），未 tag v0.3.0**。第 1 组 standingKeyFor（live-mount 等价证据）、第 2 组对抗（Developer 1 ALLOW/7 DENY）、第 4 组 enforceRoles（单测+真实 spawn）通过；第 3 组 9 角色 smoke **5/9 过、4/9 FAIL**（Product/Research/UX/UI 无法 spawn——P4-DEADNAME）；第 5 组升级狗粮**被 P4-MAINT-GUARD 阻断**（canonicalGuard 模式无关 → 维护模式无法写 preset/，连带阻塞 deadname 修复，形成死锁）。用户决定"只记录失败、不做修复"。记录与根因见 `.cq/review/p4-user-validation-2026-08-28.md`；修复前置：先修 P4-MAINT-GUARD，再修 P4-DEADNAME，全部通过后才可 tag v0.3.0 并标 VERIFIED。

## V2 Current

- V2 开源优先计划已获批准并已推送到 `origin/v2`。
- V2.0 Governance：Research/PoC Complete；Runtime Integration Pending（已签署 ADR-0020，首期复用 `tools/pre-execute`，不引入第三方策略引擎；`tools.guard()`/`fs/write-intent`/`approval` 已确认当前动态 Host 端不可用为强制控制，正式持久治理移到维护预设阶段）。
- V2.1 Memory：Schema/Index/Migration Complete（狗粮迁移 v0.2.0 已闭环）；Query Loop Complete（`tools/cq-memory-query.mjs`，索引 9/0）；bugs/preference 类型补齐完成。
- V2.2 Model Router：Native Capability Research Complete；Real Model Routing Verification Pending（首期复用 DSH 原生 per-agent provider/model + route-audit 校验；LiteLLM 仅为条件增强，需跨 provider failover 才引入）。
- V2.3 Plugin Contract：Contract PoC Complete；Production Scope Not Frozen（离线 manifest 校验器与创作期合并器就绪；真实 row/isolate 挂载验证待维护预设阶段）。

## V2 Remaining

- V2.0：Agent-scoped guard、ask 审批、正式 fs intent 和 subagent 委派状态仍需维护预设阶段验证。
- V2.1：按需评估 DSH storageDomain/SQLite FTS5；当前零依赖方案已满足首期索引验收。
- V2.2：完成 DSH 原生 per-agent 路由行为测试；只有跨 provider failover/预算需求成立才启动 LiteLLM PoC。
- V2.3：完成消费型 row、isolate 服务行、松散服务行和 host-plane row 的真实挂载验证；离线 manifest 校验器与创作期合并器已就绪。
