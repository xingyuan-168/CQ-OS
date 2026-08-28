# CQ OS 当前版本修正清单

版本：Review Fix List V1  
用途：用于当前 CQ OS 版本统一修复后，再进入 V1 狗粮验收与后续 V2 开发。

---

# 一、总体结论

当前 CQ OS 大方向没有跑偏。

当前最主要的问题不是架构错误，而是：

- V1 关键行为闭环尚未完成；
- 部分 Workflow 绕过正式角色体系；
- 部分上下游 Agent 结果没有真实传递；
- 角色工具过滤存在潜在未知工具名问题；
- V2 调研与 PoC 已提前推进，但 V1 尚未完成真实运行验收；
- 部分 Memory、失败恢复、开源调研规范、初始化模板仍未完整落地；
- 个别文档与当前真实实现状态已经发生漂移。

本轮修复目标：

> 不重构整体架构，只修正会影响 V1 真实验收、长期维护和后续 V2 开发的关键问题。

---

# 二、P0：必须优先修正的问题

## P0-1：关键 Workflow 绕过 CQ OS 正式角色体系

### 当前问题

当前 `templates/workflows/project-startup.js`、`frontend-project.js` 中直接使用：

```js
agent(...)
```

创建 Workflow 临时 Agent。

这会绕过 CQ OS 已经定义好的正式角色：

- Product
- Research
- UX
- UI
- Architect
- Developer
- Tester
- DevOps
- Review

因此以下角色治理能力不会真正应用到这些 Workflow Agent：

- persona
- toolFilter
- maxDepth: 1
- 职责限制
- 调度限制
- 权限边界

最终形成两套 Agent 体系：

1. CQ OS 正式角色 Agent
2. Workflow 临时匿名 Agent

这与“CQ Core 是唯一调度者，所有专业任务由正式角色 Agent 执行”的设计目标冲突。

### 修正原则

V1 的关键治理流程不要再由 Workflow 直接创建匿名 Agent。

关键项目流程改为：

- Core 调 Product
- Core 调 Research
- Core 调 Architect
- Core 触发 Human Gate
- Core 调 Developer
- Core 调 Tester
- Core 调 Review

Workflow 暂时只用于：

- 并行调研
- 批量分析
- 非治理关键路径
- 后续优化型编排

### 需要修改

重点检查：

```text
preset/templates/workflows/project-startup.js
preset/templates/workflows/frontend-project.js
preset/skills/cq-project-startup/SKILL.md
preset/skills/cq-roles/SKILL.md
preset/agent.cordis.yml
```

### 验收标准

真实会话中：

- 需求分析由 `subagent_product` 执行；
- 开源调研由 `subagent_research` 执行；
- 架构设计由 `subagent_architect` 执行；
- 开发由 `subagent_developer` 执行；
- 测试由 `subagent_tester` 执行；
- 审查由 `subagent_review` 执行；
- CQ Core 保持唯一调度权。

---

## P0-2：Workflow 阶段结果没有真实向后传递

### 当前问题

当前 Workflow 中存在类似：

```js
const requirements = await agent(...)
const research = await agent(...)
const decision = await agent(
  "基于需求分析和开源调研输出技术决策"
)
```

但 `requirements` 和 `research` 的实际内容没有传入 `decision`。

前端 Workflow 同样存在类似问题：

```js
const ux = await agent(...)
```

后续 UI Agent 虽然被要求“基于 UX 结果”，但没有拿到真实 `ux` 内容。

因此可能出现：

> Prompt 说“基于上一步”，但 Agent 实际不知道上一步结果。

### 修正原则

如果保留任何 Workflow：

必须显式将前序结构化结果传给后续阶段。

推荐：

- 将前序输出组织成结构化对象；
- 下一阶段 Prompt 显式引用这些结果；
- 禁止依赖隐式共享上下文。

### 验收标准

后续阶段实际输入中能看到前序阶段真实结果，而不是只有“基于上一步”的文字描述。

---

## P0-3：角色 toolFilter 中残留不存在的 Cordis 工具名

### 当前问题

当前日常 CQ OS 已经不挂载 `tool-cordis`。

但多个角色的 `toolFilter.deny` 中仍可能包含：

```text
cordis_define
cordis_run
cordis_stop
cordis_undefine
cordis_inspect_list
cordis_inspect_query
cordis_inspect_self
```

如果 DSH 当前版本对未知工具名进行严格校验，角色 Agent 可能在启动时失败。

这类问题不会一定在 `standingKeyFor()` 阶段暴露，可能直到第一次启动角色 Agent 才出现。

### 修正原则

日常 CQ OS 不挂载 `tool-cordis`，因此这些 Cordis 工具天然不存在。

应从日常角色的 deny 列表中移除不存在的 `cordis_*` 名称。

后续若新增独立 `cq-os-maint` Maintenance Mode，再单独设计 Cordis 权限。

### 需要修改

检查：

```text
preset/agent.cordis.yml
```

重点检查 9 个角色的 `toolFilter`。

### 验收标准

9 个正式角色全部完成 smoke test：

- 能成功创建；
- 不因未知 toolFilter 名称失败；
- 看不到禁止的调度工具；
- 无法继续创建下一层角色 Agent。

---

## P0-4：V1 必须完成真实狗粮闭环后才能宣告通过

### 当前问题

当前已有大量结构、PoC 和 V2 调研成果，但 V1 最核心的运行假设仍未完整验证。

### 必须完成的真实闭环

至少完整执行一次：

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

### Gate A

CQ OS 本体项目：

- 架构/设计完成后；
- Core 调用 `ask_user_question`；
- 真人未确认前不得出现开发行为；
- 确认后才允许 Developer 执行。

### Gate B

前端模拟项目：

- UX
- UI
- `ask_user_question`
- 用户未批准时禁止开发
- 批准后才进入开发

### 验收标准

V1 的“完成”必须建立在真实会话行为证据之上，而不是仅凭配置文件、文档或 PoC。

---

# 三、P1：本轮建议一起修正的问题

## P1-1：完善失败恢复机制

### 当前问题

现有设计已经提出：

```text
重试
→ 换角色或重派
→ Git 回滚
→ 人工介入
```

但当前规则层仍偏概念化，没有形成明确执行规范。

### 建议补充

写入：

```text
preset/skills/cq-governance/SKILL.md
preset/skills/cq-lifecycle/SKILL.md
preset/agent.cordis.yml
```

至少定义：

1. 工具/API 短暂错误 → 自动有限次数重试；
2. 同一角色连续失败 → Core 重新委派或调整任务；
3. 模型表现异常 → 后续支持换模型；
4. 代码导致测试失败且无法恢复 → Git 回滚到安全点；
5. 涉及破坏性操作或多次恢复失败 → 请求人工介入；
6. 所有恢复动作需要记录到 `.cq/` 提炼记忆。

### 验收标准

失败恢复不再只是 README 中的一句话，而是可执行规则。

---

## P1-2：强化开源优先调研规范

### 当前问题

Research Agent 已具备“先找开源项目”的方向，但评估标准还不够完整。

### 必须补充的调研字段

每个候选项目至少记录：

- 项目名称
- 项目网址
- 官方仓库
- License
- 最近活跃情况
- 社区/维护状态
- 技术栈
- 与当前需求匹配度
- 可以直接复用什么
- 可以二开什么
- 只能借鉴什么
- 二开成本
- 长期维护风险
- 同类型项目对比
- 为什么选它
- 为什么不选其他候选
- 最终结论：复用 / 二开 / 组合 / 自研

### 建议修改

重点修改：

```text
preset/skills/cq-project-startup/SKILL.md
preset/roles/research persona（如独立定义）
docs/ 开源调研模板
```

### 验收标准

以后任何新项目都不能只写“找到 MetaGPT/OpenHands”，必须形成真正可用于技术决策的开源评估。

---

## P1-3：补齐 CQ Memory 真实结构

### 当前状态

当前已经有：

```text
.cq/project.md
.cq/progress.md
.cq/tech-debt.md
.cq/decisions/
.cq/versions/
.cq/schema/
.cq/index.json
```

方向正确。

但设计中还包括：

```text
.cq/executions/
.cq/bugs.md
.cq/preferences.md
```

部分尚未形成真实内容或闭环。

### 修正原则

不要为了“目录齐全”制造空垃圾。

但在真实狗粮测试后，应至少产生：

- 一条执行记忆；
- 一条关联 commit 的决策或进度记录；
- 一条 Bug/异常经验（若测试过程真实产生）；
- 用户长期项目规则/偏好记录。

### Memory 写入要求

只保存提炼后的工程记忆：

- 做了什么
- 为什么这么做
- 结果如何
- 关联哪个任务
- 关联哪个 commit
- 后续影响

禁止：

- 保存整段聊天
- 保存完整 Agent 原始轨迹
- 将运行日志直接塞进 Git

### 验收标准

Memory 不只是目录和 schema，而是狗粮运行后能真正参与下一轮决策。

---

## P1-4：V2 Memory Schema 与旧数据需要迁移

### 当前问题

V2 已经建立 schema/index PoC。

但现有 ADR、progress、tech-debt、versions 等旧 Memory 文件尚未全部带：

- id
- type
- status
- updatedAt
- commit

等结构化元数据。

### 修正方式

设计一次性迁移规则：

- 旧 Markdown 保留正文；
- 添加统一 front matter / metadata；
- 重建 index；
- 保证 Git 历史连续。

### 验收标准

Memory index 不再大量报告：

```text
legacy
missing-commit
```

允许历史记录保留少量 legacy 标记，但新写入必须完全符合 schema。

---

## P1-5：补全 project-init 模板

### 当前问题

`templates/project-init/` 当前主要仍是说明性质。

而需求目标要求：

- 标准目录
- Git
- Docker
- 文档
- CI

### 建议补充

至少形成可复用模板：

```text
templates/project-init/
  README.md
  .gitignore.template
  Dockerfile.template
  docker-compose.yml.template
  docs/
  ci/
```

具体语言/技术栈模板可以后置。

### 原则

首期只做通用骨架，不要一次制造几十套语言模板。

---

# 四、P2：文档与状态一致性修正

## P2-1：统一 Cordis / 自修改能力的项目描述

### 当前真实状态

日常 CQ OS Runtime 已经不挂载 `tool-cordis`。

因此：

“以后稳定后再关闭自修改能力”

这类表述已经过时。

### 建议统一为

> CQ OS Runtime 默认不具备 Runtime 自修改能力。  
> CQ OS 的永久变更必须修改 Git 仓库 `preset/` Source of Truth 后重新部署。  
> 未来若确有需要，新增独立 `cq-os-maint` Maintenance Mode，专门用于受控维护和升级。

### 需要检查

```text
README.md
.cq/decisions/ADR-0001*
.cq/tech-debt.md
docs/*
preset/README.md
```

删除互相矛盾的旧表述。

---

## P2-2：V2 进度标记要准确

### 当前问题

V2 已经开展：

- Governance PoC
- Memory PoC
- Model Routing 调研
- Plugin Contract PoC

但这些不应被标记为“功能完成”。

### 推荐状态定义

#### Governance

```text
Research / PoC Complete
Runtime Integration Pending
```

#### Memory

```text
Schema / Index PoC Complete
Migration / Runtime Loop Pending
```

#### Model Router

```text
Native Capability Research Complete
Real Model Routing Verification Pending
```

#### Plugin Contract

```text
Contract PoC Complete
Production Scope Not Frozen
```

### 原则

避免项目自己“高估完成度”。

---

## P2-3：22 章需求覆盖状态不要全部写成“实现完成”

应采用至少三种状态：

```text
IMPLEMENTED
POC / PARTIAL
DEFERRED WITH ADR
```

例如：

模型路由：

```text
DEFERRED WITH ADR
```

路径级 RBAC：

```text
DEFERRED
```

第三方插件标准：

```text
POC / FUTURE
```

这样才能真实反映当前状态。

---

# 五、暂时不要做的事情

本轮修复期间不建议继续扩大 V2 范围。

暂缓：

- 新 Governance Engine 大规模开发
- 引入 OPA / Cedar / Casbin / Cerbos
- 自建 Plugin Runtime
- 复杂动态模型路由
- 数据库化 Memory
- 路径级 RBAC
- 大规模行业插件

原因：

> V1 核心运行闭环尚未完成真实验收。

已有 V2 调研和 PoC 全部保留，不回滚。

---

# 六、建议修复顺序

## 第一批：P0

1. 清理角色 toolFilter 中不存在的 Cordis 工具。
2. 修正 Workflow 绕过正式角色的问题。
3. 修正 Workflow 上下游结果不传递的问题。
4. 9 个角色全部 smoke test。

---

## 第二批：P1

5. 补失败恢复规则。
6. 强化 Research 开源评估模板。
7. 补 CQ Memory 闭环。
8. 做 Memory schema 迁移。
9. 补 project-init 基础模板。

---

## 第三批：P2

10. 清理 Cordis 文档漂移。
11. 校正 V1/V2 当前进度表述。
12. 更新 22 章需求覆盖状态。

---

# 七、修复完成后的验收顺序

修复后不要立即继续扩展 V2。

按以下顺序验收：

1. `standingKeyFor('cq-os')` 真挂载通过；
2. 新建 CQ OS 会话；
3. 9 个角色逐个 smoke test；
4. Core 唯一调度权验证；
5. Gate A；
6. Gate B；
7. 完整狗粮项目闭环；
8. Tester + Review 生效；
9. `.cq/` 产生真实提炼记忆；
10. Git commit / tag / remote 同步；
11. CHANGELOG 更新；
12. 22 章需求状态重新核验。

---

# 八、本轮修复完成的判断标准

只有满足以下条件，CQ OS V1 才建议正式标记为“核心验证通过”：

- 9 个专业角色真实可运行；
- Core 是唯一正式组织调度者；
- 关键治理流程不依赖匿名 Workflow Agent；
- Human Gate 真实生效；
- Developer 无法在 Gate 前执行；
- Tester 和 Review 真正参与闭环；
- CQ Memory 产生可追踪、关联 Git 的项目知识；
- Git 是唯一版本管理方式；
- 开源优先规则可实际驱动 Research；
- 失败恢复规则可执行；
- V1 / V2 文档状态与真实实现一致。

---

# 九、总体评价

当前 CQ OS 不需要推翻或重构整体方向。

本轮应视为：

> V1 真实验收前的统一收口修复。

修正上述问题后，优先完成 V1 狗粮闭环，再继续推进 V2 Governance、Memory、Router 和 Plugin Contract 的生产化。
