# 架构设计

CQ OS 由三层组成：

1. DSH Host：提供 registries、subagent backends、sandbox、approval、model route 和 AgentPresets 服务。
2. CQ OS 用户 preset：以 Cordis 为母版，贡献 CQ Core persona、治理 skills、模板资产和九个角色工具。
3. 项目仓库：保存 `.cq/` 工程知识和 `preset/` 唯一源码，Git 是唯一版本管理。

Core 是深度 0 的唯一调度者。专业角色是深度 1，toolFilter 禁止二次调度、团队控制和运行时自修改。workflow 只做编排；Human Gate 在 workflow 返回后由 Core 调用 ask_user_question。
