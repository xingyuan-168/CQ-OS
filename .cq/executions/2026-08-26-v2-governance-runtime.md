---
id: exec-v2-governance-runtime
type: execution-summary
status: done
updatedAt: 2026-08-26T22:00:00+08:00
commit: 7fb2bb1
title: V2.0 治理运行时强制（阶段G）
tags: [governance, v2, runtime-enforcement]
---

# V2.0 治理运行时强制（阶段G）

## 任务目标
把 CQ OS 治理从"声明级"推进到"运行时强制"：验证受保护路径（preset/、.cq/policy/、凭证等）能在工具执行前被 DSH 原生 guard 拒绝。

## 执行 Agent
CQ Core（本会话）通过动态插件在真实 cq-os agent scope 探测；后续工具由 Core 编写。

## 做了什么
- 在 cq-os agent scope（`agents.create` + `setup` mount cq-os）验证 `tools.guard()` 可用且能注册路径拒绝（`preset/**`、`.cq/policy/**` 命中拒绝，`src/app.js` 放行）。
- 编写 `tools/cq-protect.mjs`：读取 `.cq/policy/protected-paths.yml`，提供 `matchProtected(path)` glob 匹配器（支持 `X/**`、`**/X/**`、`**.ext`、精确路径）。
- 修复匹配器两个真实 bug（`**/credentials/**` 被 `endsWith('/**')` 分支提前拦截；`**.env` 匹配）后，6 受保护路径全命中、4 普通路径放行、缺策略目录 fail-closed。
- 编写 `tools/test-cq-protect.mjs` 回归。
- 更新 `.cq/policy/README.md` 记录运行时接线方式。

## 为什么
V2.0 目标是从 V1 软约束升级为可验证控制；路径级拒绝是硬治理的第一块。此前已验证 `tools.guard()` 在 cq-os agent scope 可用，本阶段把它与受保护路径策略真正结合。

## 结果
- 运行时强制可行：在 cq-os agent scope 注册 guard 后，受保护路径在工具执行前被拒绝。
- 匹配器与测试全通过；全套回归 7 项通过。
- 提交 `7fb2bb1`，已推送 `origin/v2`。

## 后续
- 将匹配器实际挂载进 preset（作为 guard 行）待后续接线阶段（涉及改 `preset/` + 重新部署）。
- 路由（阶段R）由用户决定暂停，routemap 保留为声明。
