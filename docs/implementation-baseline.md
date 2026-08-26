# CQ OS V0.1 实施基线

## 已确定

- 用户预设 id：`cq-os`
- 显示名称：苍穹模式
- 唯一源码：工作区 `preset/`
- 部署产物：DSH 用户预设目录中的 `cq-os`
- 远端：`git@github.com:xingyuan-168/CQ-OS.git`
- 角色：Core + Product、Research、UX、UI、Architect、Developer、Tester、DevOps、Review
- 角色最大委派深度：1
- 角色共享 deny：调度、团队控制、其他角色工具和 Cordis 自修改工具
- 记忆：仓库 `.cq/`，只保存提炼后的工程知识
- Human Gate：Core 层独立调用 `ask_user_question`

## 验收

- `standingKeyFor('cq-os')` 成功
- 新会话能看到 9 个角色工具
- Gate A：CQ OS 本体设计确认后再开发
- Gate B：前端模拟项目 UX -> UI -> 人工确认 -> 开发
- 后置能力都有 ADR、技术债、升级接口和阶段归属
