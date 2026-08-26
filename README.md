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

## 后续任务

- B1：稳定后评估日常模式关闭 Cordis 自修改能力，仅维护/升级状态启用
- B2：CQ Governance Plugin，提供不可绕过的治理策略和路径级 RBAC
- B3：第三方插件标准
- B4：模型动态路由，并核验子 Agent 实际请求模型，不能只验证 API 存在
- B5：宿主级或结构化 CQ Memory 存储
