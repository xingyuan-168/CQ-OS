# CQ OS V2 开源优先落地计划

## 总原则

V2 所有能力必须按以下顺序推进：

需求拆解 -> 开源成熟项目调研 -> 复用/二开/组合/自研判定 -> 许可证、安全性、活跃度和兼容性评估 -> 最小 PoC -> ADR 与架构设计 -> 实施 -> 验收。

未完成开源调研、方案矩阵、PoC 和 ADR 前，不得进入自研实现。不能复用时必须记录每个候选项目的具体放弃原因，并保持自研范围最小、预留未来替换接口。

每个子系统的调研记录必须包含：项目和官方文档链接、成熟度、维护状态、生产案例、许可证、安全与供应链风险、DSH 兼容性、复用/二开/组合/放弃原因、PoC 结果、已知限制和退出条件。

## V2 目标

- 治理从 V1 的软约束升级为可验证控制；
- `.cq/` 从约定式 Markdown 升级为 schema、查询、索引可重建的工程记忆；
- 模型路由落实到具体 `agent(prompt, { provider, model })`，并核验实际请求模型；
- 日常模式与 CQ OS 自维护能力隔离；
- 建立 CQ Plugin 扩展契约，但不建设在线插件市场。

保持 V1 组织模型：CQ Core 是唯一调度者；9 个专业角色默认 `maxDepth: 1`；`preset/` 是唯一源码；Git 是唯一版本管理；不修改官方 shipped preset；不持久修改 Host/Profile。

## 子版本

| 版本 | 目标 | 开源调研方向 |
|---|---|---|
| V2.0 | 治理策略与路径级权限 | OPA/Rego、Cedar、Casbin、Cerbos、DSH 原生 guard/approval/sandbox |
| V2.1 | 结构化 CQ Memory | Git-backed Markdown、SQLite/FTS、LanceDB、Mem0、Letta、Zep、DSH storage/query |
| V2.2 | 模型智能路由 | LiteLLM、Portkey、OpenRouter、LangChain/LangGraph、Semantic Router、RouteLLM、DSH LLM adapter |
| V2.3 | 插件契约与维护模式 | Backstage、VS Code Extension、Jenkins、Home Assistant、MCP、npm SemVer、DSH loader/preset generation |

每个版本先由 Research Agent 输出调研报告，再完成方案比较矩阵、许可证与安全检查、最小 PoC、ADR 和人工确认。

## V2.0 治理

先复用 DSH 原生工具 guard、approval、sandbox、permission preset、Agent/subagent 边界。只有 PoC 证明不足时，才二开 OPA、Cedar、Casbin 或 Cerbos；不自研完整策略语言。

第一批硬控制：未完成规划/设计确认时拒绝 Developer 委派；拒绝 Developer 修改 `preset/`、`.cq/policy/`、凭证和生产配置；拒绝未授权发布与高风险操作；拒绝角色二次调度、团队控制和 Cordis 自修改。策略损坏必须 fail closed，并审计允许、拒绝、等待、过期授权。

策略候选结构：`.cq/policy/policy.yml`、`roles.yml`、`gates.yml`、`protected-paths.yml`、`exceptions.yml`。最终 schema 以开源 PoC 和 DSH 实际 API 为准。

## V2.1 Memory

`.cq/` Markdown 仍是权威源，索引可删除并从 Markdown 重建。统一 memory metadata 和类型：project、decision、progress、execution-summary、bug、preference、tech-debt、version。支持按类型、状态、Agent、commit 和版本查询，校验 schema，检测重复与缺少 commit，生成工程上下文摘要。

保留 V1 文件并增量迁移，缺失字段标记为 legacy，不猜测状态；迁移失败不删除、不覆盖原记忆。不得保存原始聊天和完整运行日志。

## V2.2 路由

先路由 Core 发起的专业子 Agent 和 workflow 的 `agent()` 调用，不改变主 Agent 默认模型机制。优先使用 DSH 原生 provider/model 和 retry；只有 PoC 证明不足时才二开成熟路由项目，不自研模型客户端。

路由必须支持任务类型、角色、复杂度、能力、成本、可用性和 fallback。验收必须记录子 Agent 实际请求 provider/model，验证显式 model 没有被默认模型覆盖，验证 provider 不可用、重试、成本和超时行为。

## V2.3 插件与维护模式

CQ Plugin 与 DSH plugin row 分层。先复用 DSH plugin row、npm package metadata、SemVer 和现有 loader；只有不足时才设计最小 CQ Plugin schema。契约需声明 id、版本、兼容范围、DSH 依赖、Skill、模板、工具/文件/网络/模型/数据权限、迁移、安装/升级/卸载/回滚和安全风险。

日常 `cq-os` 不挂载 `tool-cordis`。维护模式必须独立、人工授权、Git review 后才能部署，使用 `standingKeyFor` 验证，完成后卸载；普通角色不能自行开启。

## Git 与部署

从 `v2` 分支开始。每个子版本使用 feature 分支。先提交调研、PoC 和 ADR，人工确认后实现。每次通过静态检查、单元/集成、真实挂载、新会话 smoke test 后，更新 CHANGELOG、`.cq/versions/` 和技术债，创建 tag 并推送 GitHub。

固定流程：工作区源码检查 -> Git commit -> AgentPresets.copy/resolve（首次创建）-> 同步部署产物 -> `standingKeyFor('cq-os')` -> roster -> 新会话 smoke test -> tag/远端推送。

禁止直接编辑 `$DSH_HOME/.agent-presets/cq-os`，禁止 v1/v2/v3 源码复制目录。

## 统一验收门槛

V2 能力只有同时满足以下条件才能标记为已实现：完成成熟开源/官方方案调研；记录复用、二开、组合、放弃和自研原因；完成许可证、安全和兼容性检查；完成最小 PoC；已有 ADR、接口、失败恢复和回滚方案；通过技术和行为测试；Git commit/tag/远端同步；更新 CHANGELOG、`.cq/versions/` 和技术债。
