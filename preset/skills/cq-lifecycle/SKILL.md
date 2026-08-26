# CQ Lifecycle

## Source of Truth

CQ OS 工作区 Git 仓库中的 `preset/` 是唯一源码。`$DSH_HOME/.agent-presets/cq-os` 是部署产物，只能通过部署动作覆盖生成。任何永久修改先改 `preset/`、验证、commit，再部署。临时 Cordis probe 必须用完卸载。

## 版本与变更

使用 Git branch、commit、tag、release。每次迭代更新 CHANGELOG、更新说明、风险分析和 `.cq/versions/`。需求变化必须分析影响范围、更新任务、判断架构影响并调整计划，禁止直接堆叠代码。

## 交付

完成任务输出功能说明、修改文件列表、测试结果、已知问题和后续建议，并把提炼摘要写入 `.cq/executions/`，关联 commit。

## V0.1 后置任务

- B1：评估日常模式关闭自修改能力，仅维护/升级状态启用。
- B2：CQ Governance Plugin，提供硬策略和路径级 RBAC。
- B3：第三方插件标准。
- B4：动态模型路由；验收必须检查子 Agent 实际请求模型，不能只检查 `agent(..., {provider, model})` API 存在。
- B5：宿主级或结构化 Memory 存储。
