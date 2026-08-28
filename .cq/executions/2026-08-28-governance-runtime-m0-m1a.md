---
id: exec-2026-08-28-governance-runtime-m0-m1a
type: execution-summary
status: in-progress
updatedAt: 2026-08-28T09:30:00+08:00
commit: null
title: Governance Runtime 落地 M0+M1a（Loop Breaker + fail-closed）
tags: [governance, loop-breaker, fail-closed, maintenance]
agent: CQ Core
task: governance-runtime-m0-m1a
version: 0.3.0
startedAt: 2026-08-28T08:40:00+08:00
completedAt: 2026-08-28T09:30:00+08:00
---

# Governance Runtime 落地 M0+M1a（Loop Breaker + fail-closed）

## 任务目标
按 Review 报告（CQ_OS_DSH_Review_Governance_Maintenance_当前阶段.md）把 Governance + Maintenance 规则变成真实 Runtime 行为。本条目记录 M0 与 M1a。

## 做了什么
- **M0-1 LOOP_BREAKER（规则层）**：`preset/skills/cq-lifecycle/SKILL.md`、`preset/skills/cq-governance/SKILL.md` 各新增"工具循环熔断"四条规则（同工具同参 ≤1 次；等价目标 ≤2 次且第二次必须换方案；无新信息即 `LOOP_BREAKER_TRIGGERED`；触发后 BLOCKED→总结→换方案→Human）；Core persona 与 cq-os-maint persona 同步写入；`.cq/tech-debt.md` 记录"规则层已落地，Runtime Loop Counter 后置"。
- **M0-2 状态文档同步**：`.cq/project.md` 版本 0.1.0→0.2.0；`.cq/tech-debt.md` Deferred B1 改为"tool-cordis 已不挂、cq-os-maint 已存在"；`cq-maintenance` 技能"完成后卸载"→"可常驻定义，退出会话即可"；`docs/v1-gui-acceptance.md` 提交号刷新为 6122070。
- **M1a fail-closed 三态**：`preset/plugins/cq-governance/lib/index.js` 的 `loadProjectPaths` 区分 ABSENT（ENOENT→baseline only）/ VALID / INVALID（存在但 schemaVersion≠1 或无条目→throw，禁止"损坏当缺失"）；`tools/test-cq-governance-plugin.mjs` 补 absent-vs-invalid 用例。
- **M2 调研（Research）**：结论——shell 经 command 写 protected path 可被 `tools.guard`/`pre-execute` 在分发前拦截（bash/pwsh 是注册工具，走同一流水线，含 `arguments.command` 与 `exec.agent`）；Human Gate 可用 `ctx.approval.request()` 编程触发；唯一原生 gap = 沙箱无法表达工作区内子路径只读（NATIVE_SUBPATH_ENFORCEMENT_GAP，A2）。
- 已分派 Architect 产出一体化运行时强制设计（guard 升级 / pre-execute 三态 / roles-gates 映射 / maintenance 规格 / gap 记录 / P1-13 测试可运行性）。

## 验证
- 变更 JS 均过 `node --check`。
- 完整测试运行受 P1-13 阻塞（workspace 无 node_modules，`@deepseek-ai/schemastery` 解析失败）——M5 依赖方案落地后统一回归。

## 已知问题 / 遗留
- M1b（消费 roles/gates/policy）、M2 实现、M3/M4 挂载、M5 回归待 Architect 设计产出后继续。
- 未提交；待本轮全部改动收口后一次 commit + tag。

## 恢复记录（2026-08-28）
- 事件：Developer 子代理在实现 ADR-0025 时中途失败（落盘 policy/roles/core/index.js + 测试更新后，未完成组合行/gates/tech-debt/policy 测试即终止）。
- 处置：按恢复顺序执行"重新委派"——核实已落盘文件全部 `node --check` 通过后，向同一 Developer 续发精确剩余任务清单（含测试 import 修复：index.js→core.js）。未做 Git 回滚（工作区未损坏），无需人工介入。
- 教训：多文件大任务委派时应要求子代理分阶段回报，降低中断损失面。
- 二次失败（同日）：同一 Developer 收到续做清单后再次中断且零进展（无最终消息）。按恢复顺序升级为"拆分 + 新委派"：两个全新 Developer 并行——A 负责测试修复与补全（tools/test-cq-governance-*.mjs），B 负责组合行/deny 对齐/gates/tech-debt（agent.cordis.yml×2、gates.yml、tech-debt.md），文件集不重叠。未做 Git 回滚（工作区无损坏）。
- 三次失败（Dev-A）：Dev-A 中断但留下有效诊断——`loadRoles` 的 section 正则 `/(?:^|\n)\s*roles:\s*$/` 缺 `/m`，`$` 不匹配行尾，真实 roles.yml 解析抛错。Dev-B 在中断前实际完成了全部组合/策略/记忆编辑（后经 Core 逐行核对：4 角色 deny 含 bash、tester 含 write,edit、双 governance 行、gates 两门、tech-debt 双 gap 均到位）。
- Core 接管收尾（恢复阶梯走到末段：换模型不可用、无需回滚）：Core 修正 `loadRoles` 正则（改 `/^\s*roles:\s*$/m`）；修正 `gatesDecision` 过度拦截（design/frontend 门禁不再对每个写工具 ask，待 GateState 实现再启用，符合 ADR §5）；修正测试 import（index.js→core.js，Dev-A 已改）；新建 `tools/test-cq-governance-policy.mjs`（10 类零依赖用例，含 loadRoles 真实文件回归）；自修一处断言笔误（`ls preset`→`ls preset/`）。
- 验证：Core 全量回归 10/10 全绿；死名扫描 `dead:[]`；四个 lib 文件 `node --check` 通过。Tester 角色以最小任务派发（仅跑回归粘贴输出），若后端再次失败则凭 Core 回归推进并透明记录。

## 后续
- Architect 设计批准 → Developer 实现 → Tester 回归 → 部署 + standingKeyFor('cq-os'/'cq-os-maint') → 真实会话对抗测试。
