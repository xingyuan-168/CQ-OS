# Changelog

## Unreleased / V2 baseline

- 完成 V2.0 治理开源调研与 `tools/pre-execute` 原生拒绝 PoC；记录 `tools.guard()` 动态注入兼容性限制。
- 完成 V2.1 Memory 调研与零依赖 `.cq/index.json` 可重建索引 PoC。
- 完成 V2.2 模型路由调研：优先复用 DSH 原生 per-agent provider/model，LiteLLM 保留为条件增强。
- 完成 V2.3 CQ Plugin 契约与独立维护模式开源调研及 ADR 草案。
- 建立 V2 开源优先实施基线。
- 明确所有 V2 子系统必须先完成成熟方案调研、方案矩阵、PoC、ADR 和兼容性验收。
- 将治理、Memory、模型路由、插件契约和维护模式拆为可独立验收的 V2 子版本。

## 0.1.0

- 建立 CQ OS 苍穹模式的用户预设源码结构
- 增加 CQ Core 与九个专业子 Agent 的组织与权限规则
- 增加项目启动、长期记忆、治理、角色和生命周期技能
- 记录后续模型路由、硬治理、插件生态和结构化记忆升级方向
