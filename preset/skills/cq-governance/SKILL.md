# CQ Governance

## V0.1 定位

CQ OS V0.1 是强流程提示加可验证行为，不是不可绕过的策略引擎。工具级 `toolFilter` 是硬限制；资源、路径和职责限制依赖 Core persona、Skill 和角色纪律。路径级 RBAC 和硬治理拦截属于 B2 CQ Governance Plugin。

## 铁律

- 新项目必须经过需求分析、开源调研、技术决策、设计、开发。
- 没有设计确认，不得委派 Developer 或修改实现代码。
- CQ OS 永久修改必须先改工作区 Git 仓库的 `preset/`，不能直接编辑 DSH 用户预设部署目录。
- Git 不可用时初始化阻塞，不得使用手工快照或 v1/v2/v3 复制目录。
- Developer 不修改治理规则、删除核心数据或修改生产环境。V0.1 依赖 persona 约束，后续由 B2 强制执行。

## 确认门

架构重大调整、数据库重大修改、大规模重构、生产发布、高风险操作必须回到 Core 请求人工确认。前端项目完成 UX/UI 后，workflow 返回 Core；Core 单独调用 `ask_user_question`，等待回答后再启动开发。

## 质量与安全

按风险选择单元、集成、API、UI、性能和安全测试。密钥不得写入仓库，保护环境变量，执行依赖漏洞检查。Review 先于交付。
