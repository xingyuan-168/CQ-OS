# CQ OS

CQ OS（苍穹模式）是 DSH 的第五种用户 Agent 模式，目标是让 AI 从单一任务执行者升级为具备组织、规划、开发、测试和维护能力的软件工程组织。

## Source of Truth

`preset/` 是 CQ OS 唯一源码。DSH 用户预设目录中的 `cq-os` 只是部署产物，只能由部署动作覆盖生成，禁止直接编辑部署目录。任何永久修改必须先修改 `preset/`，提交 Git，再部署。

## V0.1 范围

- 基于 DSH Creator/Cordis 预设
- CQ Core + Product、Research、UX、UI、Architect、Developer、Tester、DevOps、Review 九个专业子 Agent
- 角色工具硬隔离，角色不得二次调度或修改运行时
- `.cq/` 提炼式工程记忆
- 新项目启动、前端设计确认、版本和交付治理
- 模型动态路由、硬策略 RBAC、第三方插件标准和结构化记忆列为后续阶段

## Git

远端：`git@github.com:xingyuan-168/CQ-OS.git`

Git 是唯一版本管理方式。Git 不可用时，项目初始化必须阻塞，不使用手工快照或 v1/v2/v3 复制目录。

## V2 开源优先

V2 的任何能力必须先完成成熟开源项目或官方生态调研，再决定复用、二开、组合或最小自研。每个子系统必须有方案矩阵、许可证和安全检查、最小 PoC、ADR、接口预留、测试和 Git 版本记录后才能实施。

V2 计划见 [`docs/v2-plan.md`](docs/v2-plan.md)。

## 后续任务

- B1：CQ OS Runtime 默认不具备 Runtime 自修改能力。永久变更必须修改 Git 仓库 `preset/` 后重新部署。未来若确有需要，新增独立 `cq-os-maint` Maintenance Mode，用于受控维护和升级。
- B2：CQ Governance Plugin，优先复用 DSH guard/approval/sandbox，再评估 OPA、Cedar、Casbin、Cerbos
- B3：第三方插件标准，优先复用 DSH loader、npm metadata、SemVer、Backstage/VS Code/MCP 等成熟契约
- B4：模型动态路由，优先复用 DSH provider/model、retry 和成熟路由项目，并核验子 Agent 实际请求模型
- B5：结构化 CQ Memory，优先复用 Git-backed Markdown、SQLite/FTS 和成熟 Memory 项目
