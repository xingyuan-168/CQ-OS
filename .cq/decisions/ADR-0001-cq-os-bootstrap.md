# ADR-0001: 基于 DSH Cordis 预设 Bootstrap CQ OS

## 状态

已接受，V0.1。

## 决策

以 DSH Creator/Cordis 预设为母版，在用户预设层扩展 CQ Core、九个专业子 Agent、治理技能和 CQ Memory，不修改官方 shipped 文件和 Host/Profile 持久配置。

## 原因

复用 DSH 原生 preset、plugin row、subagent、workflow、ask_user_question、Git 和文件系统能力，避免重新实现 Agent 运行时。

## 约束

`preset/` 是唯一源码；用户预设目录是部署产物。角色 `maxDepth:1` 并通过 toolFilter 禁止二次调度。V0.1 治理是软流程与行为验收，硬策略后置。

## 后续影响

Cordis 自修改能力暂时保留用于 Bootstrap，稳定后按 B1 评估日常关闭。模型路由按 B4 实现时，必须验证子 Agent 实际请求模型，不能只验证 API 签名。
