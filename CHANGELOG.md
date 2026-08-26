# Changelog

## 0.2.0

- CQ Memory schema 一次性迁移（狗粮课题）完成：5 个记忆文件补 front matter、索引器 skip 名单修正（selfcheck/review）、签署 ADR-0024、索引 5/0 → 7/0 幂等重建、回归全过。

## Unreleased / V2 baseline

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
