# CQ Lifecycle

## Source of Truth

CQ OS 工作区 Git 仓库中的 `preset/` 是唯一源码。`$DSH_HOME/.agent-presets/cq-os` 是部署产物，只能通过部署动作覆盖生成。任何永久修改先改 `preset/`、验证、commit，再部署。临时 Cordis probe 必须用完卸载。

## 版本与变更

使用 Git branch、commit、tag、release。每次迭代更新 CHANGELOG、更新说明、风险分析和 `.cq/versions/`。

### 需求变更管理

需求变化**禁止直接堆叠代码**，必须按以下流程：

1. **影响分析**：分析变更影响哪些已完成模块、决策、记忆与测试。
2. **任务更新**：更新 `todo_write` 与 `.cq/progress.md` 的当前/未完成项。
3. **架构影响**：判断变更是否触及架构/技术决策；若是，回流 Architect 出增量 ADR（`decisions/ADR-NNNN-*.md`）。
4. **计划调整**：调整版本计划与 `.cq/versions/` 目标。
5. **记录**：变更原因与影响写入 `.cq/`，关联 commit。

### 版本追踪粒度

CQ OS 自身版本在 `.cq/versions/<版本>.md` 记录。除主版本外，明确追踪以下变更单元：

- **CQ OS 版本**：预设组合整体（`preset/agent.cordis.yml` + skills + templates）。
- **Rule 版本**：治理策略变更（`.cq/policy/*.yml` 与 `cq-governance`/`cq-roles` 规则）单独记录，可回滚。
- **Workflow 版本**：`preset/templates/workflows/*.js` 模板变更单独记录。
- **Plugin 版本**：未来插件用 SemVer + `cq-plugin.yml` 声明。

任何 Rule/Workflow 变更必须能在 Git 历史中定位到具体 commit，可回滚。

## 交付

完成任务输出功能说明、修改文件列表、测试结果、已知问题和后续建议，并把提炼摘要写入 `.cq/executions/`，关联 commit。

## 失败恢复

按以下顺序处理并记录到 `.cq/`：

1. 短暂工具/API 错误 → 有限自动重试。
2. 同一角色连续失败 → Core 重新委派、调整任务或拆分范围。
3. 模型表现异常 → 记录为待办，后续支持换模型。
4. 代码导致测试失败且无法恢复 → Git 回滚到安全点。
5. 破坏性操作或多次恢复失败 → 请求人工介入。
6. 所有恢复动作写入 `.cq/`，关联任务与 commit。

## V0.1 后置任务

- B1：CQ OS Runtime 默认不具备 Runtime 自修改能力。永久变更必须修改 Git 仓库 `preset/` 后重新部署。未来若确有需要，新增独立 `cq-os-maint` Maintenance Mode，用于受控维护和升级。
- B2：CQ Governance Plugin，提供硬策略和路径级 RBAC。
- B3：第三方插件标准。
- B4：动态模型路由；验收必须检查子 Agent 实际请求模型，不能只检查 `agent(..., {provider, model})` API 存在。
- B5：宿主级或结构化 Memory 存储。
