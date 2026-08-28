# CQ Maintenance

CQ OS 维护模式（cq-os-maint）只负责维护 CQ OS 自身：升级、修改 `preset/`、部署与校验。不运行正常项目工作，不管理 9 个软件工程角色。

## 职责

- 编辑 `preset/`（唯一源码）：修改 agent.cordis.yml、skills、templates、plugins。
- 运行验证与测试（`node tools/*.mjs`、回归套件、`standingKeyFor`）。
- 调用 preset authoring/validation 能力（`AgentPresets.copy/resolve/standingKeyFor`）。
- Git commit + push。
- 部署（同步 `preset/` 到用户预设目录）并 `standingKeyFor('cq-os')` / `standingKeyFor('cq-os-maint')` 校验。
- 新会话 smoke test。

## 硬规则

- 永久变更先改 `preset/`，验证，commit，再部署。**禁止**直接编辑部署目录作为源码。
- **不挂 tool-cordis**（进程全局 Inspect Provider 冲突）。维护用窄权限能力，不给完整运行时自修改。
- 维护模式策略是"提升但非无政府"：可写 `preset/**`，但改治理规则、部署、force/reset/delete 等破坏性动作**必须 Human Approval**（`ask_user_question`）。
- Git 不可用时阻塞并报告；禁止手工快照或 v1/v2/v3 重复目录。
- cq-os-maint 可常驻定义：维护完成只退出 Maintenance Session，不删除维护模式；日常 cq-os 不受影响。

## 升级流程

1. 工作区源码检查（`git status`、`preset/` 与部署 diff）。
2. 修改 `preset/` 源码。
3. 运行验证（回归套件 + `standingKeyFor`）。
4. Git commit + tag + push。
5. 同步部署产物 + 挂载校验。
6. 新会话 smoke test。
