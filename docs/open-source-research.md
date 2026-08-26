# 开源调研记录（初版）

| 项目 | 借鉴点 | 选择/放弃原因 |
|---|---|---|
| MetaGPT | AI 软件公司、SOP、多角色协作 | 借鉴组织和流程范式；不直接替换 DSH 运行时 |
| OpenHands | 软件工程 Agent 生命周期 | 借鉴工程任务编排；不重复建设独立 Agent Harness |
| Cline Memory Bank | 分层项目记忆文件 | 借鉴提炼式仓库记忆；使用 CQ `.cq/` 约定落地 |
| Claude Code subagents | 角色化子 Agent 和工具边界 | 借鉴角色提示与权限过滤；使用 DSH 原生 subagent |

## 最终方案

复用 DSH Creator/Cordis 预设、plugin rows、原生 subagent、workflow、Git 和 ask_user_question。自主实现只限 CQ 组织规则、治理技能、角色组合和项目记忆约定。
