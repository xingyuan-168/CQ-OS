---
id: progress
type: progress
status: active
updatedAt: 2026-08-26T21:52:47+08:00
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

## V1 Status

- V1 源码、部署、`standingKeyFor('cq-os')` 真挂载和 Git v0.1.0 已完成。
- 已完成 P0–P2 收口修复：清理 8 角色 toolFilter 死名、修正 Workflow 绕过角色与结果传递、补失败恢复规则、补 Research 开源评估字段、Memory schema 迁移规则、project-init 骨架、统一 Cordis 自修改描述、校正 V2 进度标记。
- 新增死名扫描回归防护 `tools/check-toolfilter-deadnames.mjs`（`agent.cordis.yml` 扫描为 `dead: []`）。
- 新苍穹模式会话工具目录、Gate A、Gate B、9 角色 smoke test 仍需用户在 Web GUI 实测。

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
