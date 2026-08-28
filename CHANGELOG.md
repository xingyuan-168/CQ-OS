# Changelog

## Unreleased — Governance Runtime Enforcement (pre-P4)

- LOOP_BREAKER 规则层落地（cq-lifecycle/cq-governance skill + Core/maint persona + tech-debt）：同工具同参 ≤1 次、等价目标 ≤2 次、无新信息即 BLOCKED。
- @cq/governance 运行时强制升级（ADR-0025）：双钩子（guard 单调 deny + pre-execute allow/deny/ask，ask 路由 approval seam、无 seam 退化 deny）；fail-closed 三态（absent≠invalid）；shell 保守字面匹配（非 parser）；roles/gates/policy 消费；maintenance 模式提升 preset/** 可写、治理文件/部署/force/reset 仍 ask；A2 gap（沙箱子路径只读）三处登记。
- 模块拆分（policy/roles/core 零依赖 + index 保留 schemastery Config）使干净克隆可跑纯逻辑测试。
- 组合接入：cq-os 与 cq-os-maint 均加 @cq/governance 行；tester deny 增 write/edit；product/research/ux/ui deny 增 bash。
- gates.yml 增 dangerous-ops、governance-rule-change；tech-debt 登记 NATIVE_SUBPATH_ENFORCEMENT_GAP (A2) 与 ROLE_IDENTITY_ASSOCIATION_GAP。
- 测试：新增 test-cq-governance-policy.mjs（10 类零依赖用例）；全套回归 10/10；Tester 独立复验 all-pass。
- 状态：代码+部署+Tester 全绿；standingKeyFor 与真实会话对抗（P4）待用户实测；Hard Governance 暂为 PARTIAL，P4 通过后再 tag v0.3.0 并标 VERIFIED。

## 0.2.0

- CQ Memory schema 一次性迁移（狗粮课题）完成：5 个记忆文件补 front matter、索引器 skip 名单修正（selfcheck/review）、签署 ADR-0024、索引 5/0 → 7/0 幂等重建、回归全过。

## Unreleased / V2 baseline

- V2 阶段G/M/V/P 增量：治理运行时强制（`tools/cq-protect.mjs` 保护路径匹配器 + 6 命中/4 放行/fail-closed 测试，已证实在 cq-os agent scope 经 guard 拒绝受保护路径）；Memory 决策闭环（决策前查询/任务后写入规则、首个 execution-summary 真实条目、索引 skip 扩展 policy/.README）；版本化收口（需求变更管理流程 + Rule/Workflow 版本追踪）；插件开发运行手册（validate→compose→挂载→卸载完整闭环）。
- 智能路由（阶段R）由用户决定暂停接线，`.cq/routemap.yml` 保留为按角色的真实模型声明。
- V2 阶段1/2/3/4/5 生产化增量：验证 `tools.guard()` 在 cq-os agent scope 可用（关闭 ADR-0020 阻塞项）；Memory 查询/类型补齐（9/0）；`.cq/policy/` 治理策略基准 + fail-closed 校验器；`.cq/routemap.yml` 路由映射 + 校验器；V2.3 插件 validate+compose 端到端测试。
- V2.1 Memory 生产化（本会话部分）：新增 `tools/cq-memory-query.mjs` 查询/过滤能力（按 type/status/agent/commit/version），补 `.cq/bugs.md`、`.cq/preferences.md` 类型骨架，补 `review` 目录 skip 回归断言，索引 9 records / 0 reports。
- 完成 V2.0 治理开源调研与 `tools/pre-execute` 原生拒绝 PoC；记录 `tools.guard()` 动态注入兼容性限制；签署 ADR-0020（首期复用 pre-execute，不引入第三方策略引擎）。
- 完成 V2.1 Memory 调研与零依赖 `.cq/index.json` 可重建索引 PoC。
- 完成 V2.2 模型路由调研：优先复用 DSH 原生 per-agent provider/model，LiteLLM 保留为条件增强；实现 route-audit 校验并完成原生路由观测 PoC。
- 完成 V2.3 CQ Plugin 契约与独立维护模式开源调研及 ADR 草案；实现 manifest 校验器与创作期合并器（候选 B）。
- 建立 V2 开源优先实施基线。
- 明确所有 V2 子系统必须先完成成熟方案调研、方案矩阵、PoC、ADR 和兼容性验收。
- 将治理、Memory、模型路由、插件契约和维护模式拆为可独立验收的 V2 子版本。

## 0.1.0

- 建立 CQ OS 苍穹模式的用户预设源码结构
- 增加 CQ Core 与九个专业子 Agent 的组织与权限规则
- 增加项目启动、长期记忆、治理、角色和生命周期技能
- 记录后续模型路由、硬治理、插件生态和结构化记忆升级方向
