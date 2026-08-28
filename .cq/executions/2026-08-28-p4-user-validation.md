---
id: exec-2026-08-28-p4-user-validation
type: execution-summary
status: completed
updatedAt: 2026-08-28T15:20:00+08:00
commit: c27301a897555f25e4032cf9374b6f904c3bf46c
title: P4 用户实测（整体测试 + 如实记录）→ PARTIAL，未 VERIFIED
tags: [p4, user-validation, governance, maintenance, deadname, canonical]
agent: CQ Core
task: p4-user-validation
version: 0.3.0
startedAt: 2026-08-28T14:10:00+08:00
completedAt: 2026-08-28T15:20:00+08:00
---

# P4 用户实测（整体测试 + 如实记录）

## 目标
按 `docs/p4-user-validation-checklist.md` 在真实 GUI 会话逐组执行并如实记录测试数据；判定 PARTIAL→VERIFIED 唯一路径。

## 结果总览：PARTIAL（未 VERIFIED），不 tag v0.3.0 正式

- 第 1 组 standingKeyFor（P0-11）：通过（live-mount 等价证据；字面调用本会话不可达，已如实说明）。
- 第 2 组 P4 对抗（P0-12）：Developer 8 项 1 ALLOW / 7 DENY 全符合期望；Tester / Review 边界符合设计。
- 第 3 组 9 角色 smoke：**5/9 通过，4/9 FAIL**（Product/Research/UX/UI 无法 spawn —— P4-DEADNAME）。Gate A/B 声明+persona+真实 gate 调用验证。
- 第 4 组 enforceRoles（P0-9/10）：roleRegistry 单测通过、真实 spawn 行为正确；enforceRoles 保持 false，未开启。
- 第 5 组 cq-os-maint 升级闭环（P0-13）：**阻断** —— P4-MAINT-GUARD（canonicalGuard 模式无关）使维护模式无法写 `preset/`，连带阻塞 P4-DEADNAME 修复。
- 第 6 组：记录落盘 + 内存索引重建。

## 真实失败（2 项，均记录根因、未修复，用户选择"只记录失败"）

1. **P4-DEADNAME**：win32 上 4 个角色 deny 列表引用不存在的 `bash`（tool-bash disabled）→ `tools.restrict()` 抛错 → 无法 spawn；死名扫描器只查 `cordis_*` 故漏报。
2. **P4-MAINT-GUARD**：`canonicalGuard` 硬编码锚定 preset/.cq/policy/.dsh，不读 mode → maintenance 模式写 preset/ 仍被 canonical deny（pre-execute deny 终态、不可被审批覆盖）→ cq-os-maint 核心职能不可用，形成修复死锁。

## 验证数据要点

- 回归：11/11 单测通过；`test-all.mjs` 汇总因沙箱子进程管道 EPERM 误报（环境性）。
- 部署：源码 ↔ 部署（cq-os / cq-os-maint / plugin web+desktop+temp）hash 全部一致。
- 新建会话：cq-os（session-d6bb1b0f…）与 cq-os-maint（session-475dd52a…）均全组合挂载成功。

## 变更文件

- `.cq/review/p4-user-validation-2026-08-28.md`（完整测试记录 + 根因分析）
- `.cq/tech-debt.md`（新增 P4 各项 gap 记录）
- `.cq/progress.md`（P4 状态更新：PARTIAL）
- 未改动 `preset/`（用户决定不修复）；未 tag。

## 已知问题 / 后续

- 修复前置：先修 P4-MAINT-GUARD（canonicalGuard 按 effectiveGuard(mode) 派生锚定根），再修 P4-DEADNAME（平台条件式 deny），然后重跑第 3/5 组，全部通过才可 tag v0.3.0 并标 VERIFIED。
- 附带的 deadname 扫描器扩展、preflight 映射修正、shell 过度拦截权衡、治理 shell 门禁缺口、`.tmp/` gitignore 均为候选后续项。

## 恢复记录

- 事件：P4-MAINT-GUARD 阻断维护闭环（编辑 `preset/agent.cordis.yml` 被 canonical deny；带沙箱升级重试同样被拒）。
- 处置：按恢复顺序判断——有限重试已完成（仍拒）、重新委派/拆分不适用（问题在守卫实现本身）、模型更换不可用、无需 Git 回滚（无损坏提交）→ 到达**人工介入**：向用户呈报恢复选项，用户选择"只记录失败，不做修复"；维护会话已取消。
