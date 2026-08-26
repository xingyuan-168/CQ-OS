# CQ OS 模型路由映射说明

本目录的 `routemap.yml` 声明 CQ OS 的模型路由策略：每个角色/任务类别对应的推荐 `provider/model`。它由 `tools/cq-routemap.mjs` 校验结构合法性（fail-closed），并由 `tools/cq-route-audit.mjs` 在运行时核验实际 served route。

## 语义

- `default`：兜底路由。
- `byRole`：按角色路由（如 Architect 用强模型、Developer 用常规模型）。
- `byComplexity`：按复杂度路由（high/low）。

## 真实模型核对

`routemap.yml` 引用的 `provider/model` 必须是 DSH 部署中**实际已注册**的模型（见 DSH settings 的 provider 目录，如 `agent-default-model` 与 `llm` provider 配置）。CQ OS 不会虚构模型名；若部署模型池变化，须同步更新本映射并让 `cq-routemap.mjs` 校验通过。

## 核验

- `node tools/cq-routemap.mjs .cq/routemap.yml`：结构校验。
- `node tools/cq-route-audit.mjs <route-record>`：核验单条请求的 requested/served route 是否一致或发生 fallback。

> 本映射是声明源，不是运行时强制；DSH 原生 per-agent `provider/model` 是执行层。
