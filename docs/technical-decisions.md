# 技术决策

## ADR-0001

采用 DSH Creator/Cordis 作为 Bootstrap 母版，复用官方插件 rows 和工具，不修改 shipped preset、Host 或 Profile 持久配置。

## ADR-0002

CQ Memory 使用项目仓库 `.cq/` 的提炼式 Markdown，随 Git 版本化，不复制原始对话日志。

## ADR-0003

角色 Agent 统一 maxDepth:1，并通过共享 toolFilter deny 封死 subagent、workflow、ralph、团队控制、其他角色和 Cordis 自修改能力。

## ADR-0004

模型路由后置为 B4。实现时必须验证子 Agent 的实际请求模型，因为显式 model 参数可能被默认路由覆盖；不能只验证 API 签名。
