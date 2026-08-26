# CQ OS V1 狗粮验收清单（用户在 Web GUI 执行）

本清单用于本轮修复后，在真实 CQ OS 会话中完成 V1 核心闭环验收。代码/配置修复已完成并推送，以下步骤需真实运行确认。

## 前置

- 工作区：`D:\dsh-projects\CQ OS`（`preset/` 为唯一源码）
- 远端：`git@github.com:xingyuan-168/CQ-OS.git`
- 已在 `v2` 分支，最新提交 `74fad53`
- 若更改过 `preset/agent.cordis.yml` 或任一 skill，需重新部署用户预设并验证 `standingKeyFor('cq-os')`

## 1. 挂载验证

在 DSH 环境中执行挂载校验，确认组合可挂载：

```text
standingKeyFor('cq-os')
```

预期：正常返回（无 `Cannot find package`、无 waiting-for-service、无 process-global service 冲突）。

## 2. 新建 CQ OS 会话

新建一个使用 `cq-os` 预设的会话，确认：

- 工具目录包含：Product/Research/UX/UI/Architect/Developer/Tester/DevOps/Review 对应角色工具（`subagent_*`）、`tool-workflow`、`tool-ask-user`、`tool-todo`、`tool-web`、`tool-pwsh`（Windows）；
- **不包含**任何 `cordis_*` 工具（`cordis_define`、`cordis_run`、`cordis_stop`、`cordis_undefine`、`cordis_inspect_*`）；
- 不包含 `tool-cordis`。

## 3. 9 角色逐个 smoke test

逐个调用 `subagent_product`、`subagent_research`、`subagent_ux`、`subagent_ui`、`subagent_architect`、`subagent_developer`、`subagent_tester`、`subagent_devops`、`subagent_review`，确认每个：

- 能成功创建；
- 不因未知 toolFilter 名称失败（本轮已从 8 角色 deny 中移除 `cordis_*` 死名）；
- 看不到其它角色工具、调度工具、团队控制工具；
- 无法继续创建下一层角色 Agent（`maxDepth: 1`）。

补充说明：`role-review` 使用 `allow: [read, glob, grep, skill, web_search]`，应只读、不修改文件、不执行命令。

## 4. Core 唯一调度权验证

- Core 是唯一调度者，串行/并行调用角色，角色之间不得直接通信或创建子 Agent。
- 关键治理流程（需求分析、调研、架构、开发、测试、审查）由 Core 走正式角色，不得用 workflow 匿名 Agent 替代。

## 5. Gate A（CQ OS 本体）

- 架构/设计完成后，Core 调用 `ask_user_question`；
- 真人未确认前，不得出现开发行为；
- 确认后才允许 Developer 执行。

## 6. Gate B（前端模拟项目）

- UX/UI 完成后，Core `ask_user_question`；
- 用户未批准时禁止开发；
- 批准后才进入开发。

## 7. 完整狗粮闭环

完整执行一次：

```text
CQ Core
→ Product / Research
→ Architect
→ Design Gate
→ Developer
→ Tester
→ Review
→ CQ Memory 提炼
→ Git Commit / Tag
→ 成果交付
```

确认 Tester 与 Review 真正参与闭环，`.cq/` 产生可追踪、关联 commit 的项目知识。

## 8. 文档状态核验

- `.cq/progress.md` 的 V1 状态与真实实现一致；
- V2 状态采用 `Research/PoC Complete + Runtime Integration/Real Verification Pending` 表述；
- 不再出现“稳定后再关闭自修改能力”等过时表述。

## 说明

- P2-3（22 章覆盖表）：经确认当前仓库无此表，本轮跳过，不新造。
- OPA/Cedar/Casbin/Cerbos 不引入；不建 Plugin Runtime；不做数据库化 Memory；不做路径级 RBAC；不作大规模行业插件。已有 V2 调研、PoC、ADR、工具（memory-index/route-audit/plugin-validate/plugin-compose）全部保留不回滚。
