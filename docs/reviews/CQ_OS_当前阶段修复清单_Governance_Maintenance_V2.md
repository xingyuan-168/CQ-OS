# CQ OS 当前阶段修复清单

> 实施状态（2026-08-28）：P0-1/2/3/4/5/6/7/8 已实现并测试（commit `241c7ce`、`aa911be`，部署 web+desktop+Temp）；P0-9/10 已落地；P0-11/12/13 待用户 GUI 实测；A2 shell 残余维持 PARTIAL。本文档为源 review，实施以 `preset/`、`.cq/`、CHANGELOG 为准。

版本：Governance + Maintenance 收口修复版  
用途：直接交给 DSH 执行。  
原则：不重构 CQ OS，不做模型路由，不扩 Agent；本轮只完成 Governance / cq-os-maint 的生产边界收口与真实验收。

---

# 一、总体结论

当前 CQ OS 总体方向正确。

已确认：

- `cq-os` 第五模式成立；
- Core + 9 专业角色基本成立；
- CQ Memory 已进入真实可用阶段；
- `@cq/governance` 已正式进入 runtime / maintenance preset；
- LOOP_BREAKER 已进入 Core / Lifecycle / Governance 规则；
- 当前自动测试体系明显完善；
- Governance 已从 PoC 进入“生产边界收口”阶段。

当前不要继续扩功能。

本轮目标：

> 把 Governance 从“源码已接入 + 单测通过”提升到“真实 standing 可挂载 + 真实会话不可绕过 + 角色/Gate/路径语义闭合”。

---

# 二、P0-1：Governance 缺少 `tools.guard()` 时必须 fail-closed

## 当前问题

当前插件逻辑类似：

```js
const tools = ctx.get('tools')

if (tools && typeof tools.guard === 'function') {
  // register guard
}
```

如果：

```text
tools.guard === undefined
```

当前可能直接跳过 guard 注册，并继续 mount。

这属于 fail-open。

## 修复要求

改为：

```text
若 Governance 运行模式要求 hard guard，
但 tools.guard 不存在：

→ 立即 throw
→ 插件 apply/mount 失败
→ cq-os 不允许在无 hard guard 状态继续运行
```

不要静默降级。

## 验收标准

模拟：

```text
ctx.get('tools').guard 不存在
```

预期：

```text
Governance mount FAIL
```

而不是：

```text
Governance mount PASS but no guard
```

---

# 三、P0-2：Project Policy 必须绑定当前 Agent Workspace，而不是 Host `process.cwd()`

## 当前问题

Project Policy 当前路径类似：

```text
.cq/policy/
```

如果内部使用：

```js
readFileSync(join('.cq/policy', ...))
```

实际依赖 Node Host：

```text
process.cwd()
```

而不是当前 Agent / Session 的项目 workspace。

未来多项目运行时可能出现：

```text
Host
├── Project A/.cq/policy
└── Project B/.cq/policy
```

但 Governance 错误读取 Host cwd 下的策略。

## 修复要求

Project Policy root 必须从当前 Agent / Session workspace 推导。

优先使用 DSH 当前 session / filesystem 上下文，例如：

```text
session.header.cwd
Agent filesystem root
ctx.fs 解析出来的 workspace root
```

禁止使用：

```text
process.cwd()
```

作为项目 Policy 的长期可信来源。

## 建议实现

Governance policy loader 设计成：

```text
Baseline Policy
→ 插件内置

Project Policy
→ resolve from current agent workspace
→ <workspace>/.cq/policy/
```

如果同 Host 同时存在多个 session：

```text
按 workspace/session 分开加载/缓存
```

禁止做全局单例 Project Policy。

## 验收标准

建立两个临时项目：

```text
A/.cq/policy/
B/.cq/policy/
```

分别启动 Agent。

验证：

```text
A 只读 A Policy
B 只读 B Policy
```

不串项目。

---

# 四、P0-3：Protected Path 必须使用 Canonical Path，修复绝对路径 / traversal 绕过

## 当前问题

当前路径判断主要是字符串 normalize + glob。

可能正确拒绝：

```text
preset/agent.cordis.yml
```

但以下路径存在绕过风险：

```text
C:\project\preset\agent.cordis.yml
src/../preset/agent.cordis.yml
./preset/agent.cordis.yml
symlink -> preset/
```

简单字符串：

```text
startsWith('preset/')
```

不足以构成硬治理。

## 修复原则

不要继续自己增强字符串路径解析器。

优先复用 DSH filesystem canonical identity：

```text
ctx.fs.resolve(...)
ctx.fs.contains(...)
```

或当前版本等价原生能力。

## 推荐架构

保留当前 glob 字符串匹配作为第一层快速 deny：

```text
Layer 1:
raw/normalized path match
```

新增 canonical enforcement：

```text
Layer 2:
FS resolve → canonical path
→ 判断是否位于 protected root
```

任何一层 deny：

```text
DENY
```

## 必须测试

```text
preset/x
./preset/x
src/../preset/x
absolute path -> preset/x
.env
credentials/**
.cq/policy/**
.dsh/**
symlink indirect write
```

## 验收标准

FS write/edit 等主要文件工具无法通过：

```text
absolute path
..
symlink
```

绕过 protected path。

---

# 五、P0-4：Role Registry 必须真正接入 Runtime

## 当前问题

当前已有：

```text
roleRegistry
observeSpawn()
correlateStart()
```

但需要确认 `apply()` 已真正监听 DSH Runtime 事件并调用这些逻辑。

不能只：

```text
实现函数
+ 单测通过
```

而没有：

```text
真实 subagent spawn
→ role identity
→ child session
```

关联。

## 修复要求

正式接入：

### 1. Spawn 观察

当 Core 调：

```text
subagent_developer
subagent_tester
subagent_review
...
```

记录：

```text
pending child role = developer/tester/review
```

### 2. Start 关联

监听当前 DSH 官方 `subagent/start` 事件。

确认真实 payload 字段。

当前重点检查：

```text
info.id
```

是否才是 child agent/session id。

不要继续使用未经证实的：

```text
childSessionId
sessionId
```

如果当前 DSH 源码已经变更，以实际版本为准。

### 3. Runtime 查询

Governance 执行工具前：

```text
current child/session
→ resolve role
→ apply role policy
```

## 验收标准

真实启动：

```text
subagent_developer
subagent_tester
subagent_review
```

然后 Governance 必须能准确得到：

```text
developer
tester
review
```

不能大量返回：

```text
UNKNOWN
```

---

# 六、P0-5：必须加入 Core 的 Baseline Role

## 当前问题

Governance 角色解析可能返回：

```text
core
```

但 Project `roles.yml` 里主要定义 9 个专业角色。

如果未来直接打开：

```yaml
enforceRoles: true
```

而：

```text
roles.core == undefined
```

则在 default deny 语义下可能把 Core 自己锁死。

## 修复要求

在插件内置 Baseline Roles 中明确：

```text
core
product
research
ux
ui
architect
developer
tester
devops
review
```

Core 权限不能依赖 Project Policy 是否声明。

Project Policy 只能收紧 Core 权限，不能新增系统级能力。

---

# 七、P0-6：角色权限也必须做 Baseline + Project 单调收紧

## 当前问题

Protected Paths 已基本符合：

```text
Baseline ∪ Project
```

但角色权限若主要读取：

```text
.cq/policy/roles.yml
```

则项目有机会写：

```yaml
tester:
  canWrite: true
```

从而放宽系统基线。

这违反冻结设计：

> Project Policy 只能收紧，不可放宽 Baseline。

## 修复要求

在 `@cq/governance` 内置：

```text
BASELINE_ROLES
```

Project Role Policy 只作为附加限制。

## 合并语义

### 布尔能力

如：

```text
canWrite
canExecuteCommand
canDeploy
canModifyGovernance
```

Effective：

```text
Baseline && Project
```

如果 Project 没写：

```text
使用 Baseline
```

Project 不允许把 false 改 true。

### cannot / deny

Effective：

```text
Baseline ∪ Project
```

### allowed tools / paths

Effective：

```text
取更小范围
```

### approval required

Effective：

```text
取更严格的一方
```

## 验收标准

Project 尝试：

```yaml
tester:
  canWrite: true
```

如果 Baseline Tester：

```text
canWrite: false
```

最终必须仍为：

```text
false
```

---

# 八、P0-7：Gate 也需要 Baseline + Project 语义

## 当前问题

当前：

```text
gates.yml
```

存在，但 production / dangerous / governance gate 与 design/frontend gate 的硬度不同。

必须把状态说清楚，并防止项目放宽系统 Gate。

## 本阶段建议

### Runtime Hard Gates

必须进入 Governance Runtime：

```text
production deploy
修改 Governance Baseline / 治理规则
force/reset
危险删除
CQ OS 自升级部署
高风险 Git 操作
```

### Process Gates

暂时继续由 Core / persona 执行：

```text
design approval
frontend approval
```

这两项本轮不需要做复杂 Gate Engine。

## 合并规则

Baseline 要求 approval：

```text
Project 不允许取消
```

Project 可以新增 approval。

---

# 九、P0-8：`policy.yml` 必须真正进入 Runtime，或明确降级为 Offline Validator

## 当前问题

当前已经有：

```yaml
defaultDeny: true
failClosed: true
```

但如果 `@cq/governance` Runtime 没读取 `policy.yml`，则它只是离线声明。

## 推荐修复

让 Governance Runtime 真正加载：

```text
policy.yml
```

并使用：

```text
defaultDeny
failClosed
policyVersion
mode
```

等 Runtime 级设置。

## 不建议

保留一个：

```text
看起来像 Runtime Policy
```

但实际上只用于：

```text
tools/cq-policy.mjs
```

离线校验。

如果暂时不消费，必须在文档明确标记：

```text
OFFLINE_VALIDATION_ONLY
```

---

# 十、P0-9：暂时不要直接打开 `enforceRoles: true`

## 当前状态

当前：

```yaml
enforceRoles: false
```

本轮修复前不要直接切 true。

因为必须先确保：

```text
Role Registry Runtime wiring
Core role
Baseline role merge
Project role monotonic merge
UNKNOWN role fail-closed behavior
```

全部正确。

## 正确顺序

```text
修 Role Registry
→ Role tests
→ Real subagent tests
→ Project/Baseline merge tests
→ Core tests
→ 再考虑 enforceRoles=true
```

---

# 十一、P0-10：LOOP_BREAKER 已进入规则，但需要真实行为验收

## 当前进展

LOOP_BREAKER 已写入：

```text
Core persona
cq-lifecycle
cq-governance
```

这是正确方向。

## 仍需验证

模拟：

```text
同一个 read
同一文件
同一行范围
连续重复
```

以及：

```text
不同参数
但同一目标
没有新增信息
```

期望：

```text
LOOP_BREAKER_TRIGGERED
→ BLOCKED
→ 不再继续工具调用
```

## 本阶段要求

只验证规则层行为即可。

暂时不要为了 LOOP_BREAKER 自建复杂 Runtime 调度框架。

---

# 十二、P0-11：最新 Governance 必须重新跑真实 standing 验收

## 必须执行

最新源码部署后：

```text
standingKeyFor('cq-os')
standingKeyFor('cq-os-maint')
```

之前旧版本 PASS 不算当前版本证据。

## 验收要求

必须记录：

```text
source commit
deployed generation/version
standingKeyFor result
timestamp
```

建议写入：

```text
.cq/review/
或
.cq/executions/
```

---

# 十三、P0-12：真实 P4 权限对抗测试

单元测试通过不能替代 Runtime 对抗。

必须在新 `cq-os` Session 中真实测试。

## Developer

尝试：

```text
write src/allowed.txt
write preset/x
write .cq/policy/x
write .env
write credentials/x
bash/pwsh 写 protected path
absolute path 写 protected path
../ traversal
```

## Tester

确认：

```text
允许测试执行
不允许项目文件写
不允许 protected path 写
```

如果 Tester 仍需测试生成临时文件：

```text
必须明确限定 tmp/test-artifacts 范围
```

不要模糊处理。

## Review

确认真实只读。

## Product / Research / UX / UI

必须真实 spawn 一次。

重点检查 Windows 环境下：

```text
toolFilter deny: bash
```

是否会因为 unknown tool name 导致 child startup failure。

如果发生：

```text
立即改平台相关 toolFilter
```

不要重复之前 Cordis deadname 问题。

---

# 十四、P0-13：Maintenance Mode 真实升级闭环

`cq-os-maint` 不能只通过 standing。

必须真实完成一次最小升级狗粮：

```text
进入 cq-os-maint
→ 检查 Git clean
→ 修改 preset/ 中一个安全小改动
→ tests
→ Human Approval
→ commit
→ deploy
→ standingKeyFor('cq-os')
→ 新 cq-os session
→ 验证升级生效
```

## Maintenance 约束

允许：

```text
preset/**
CQ OS upgrade
deploy
validation
```

仍需 approval：

```text
Governance Baseline 修改
治理规则修改
force/reset
危险删除
production deploy
大规模 Source of Truth 重构
```

---

# 十五、P1-1：Generic / Fork 二次调度最终要收紧

当前仍需保留技术债：

```text
Core
→ Generic/Fork
→ 其他 Agent
```

理论绕过。

正式 1.0 前建议：

```text
Generic/Fork maxDepth
Generic/Fork toolFilter
named role visibility
workflow/ralph/team controls
```

最终目标：

> CQ Core 是唯一正式组织者。

当前 Governance 主线期间可以不打断修复。

---

# 十六、P1-2：仓库测试依赖要做到 clone 后可回归

当前 Governance 相关测试曾暴露：

```text
@deepseek-ai/schemastery
```

依赖环境问题。

## 建议

完善根仓库：

```text
package.json
workspace
devDependencies
test bootstrap
```

目标：

```text
git clone
→ install
→ npm/pnpm test
→ 全部测试可跑
```

不要依赖本机 DSH Profile 中已有依赖。

---

# 十七、P1-3：版本和文档状态同步

检查：

```text
preset/VERSION
.cq/project.md
CHANGELOG.md
README.md
.cq/tech-debt.md
.cq/progress.md
```

避免：

```text
preset/VERSION = 0.1.0
project = 0.2.x
README = “未来新增 cq-os-maint”
实际 maint 已存在
```

所有文档必须以真实实现为准。

---

# 十八、P1-4：CQ Memory 当前缺失 commit 元数据收口

当前 Memory Index 已较稳定。

最新未提交工作可能出现：

```text
missing-commit
```

本轮最终 commit 后：

```text
回填/重建 index
```

目标：

```text
0 reports
```

如果是正在开发中的工作允许临时 missing commit，但不能带入阶段结束状态。

---

# 十九、本轮禁止事项

本轮禁止：

- 模型路由
- 新 Agent
- Plugin Marketplace
- 新策略语言
- OPA / Cedar / Casbin / Cerbos
- 自研 Shell parser
- 第二套 Runtime
- 修改 DSH 官方源码解决 CQ 问题
- 手工往 DSH 安装目录 node_modules 塞补丁
- 在真实 standing 未完成前继续扩功能

---

# 二十、推荐执行顺序

## Step 1

修：

```text
missing tools.guard → fail-closed
```

## Step 2

修：

```text
Project Policy → current agent workspace
```

## Step 3

修：

```text
canonical FS protected-path enforcement
```

## Step 4

修：

```text
roleRegistry runtime wiring
subagent/start real payload
Core role
```

## Step 5

实现：

```text
Baseline Roles + Project Roles monotonic merge
Baseline Gates + Project Gates monotonic merge
```

## Step 6

让：

```text
policy.yml
```

真正进入 Runtime。

## Step 7

补完单测。

## Step 8

最新 source deploy。

## Step 9

执行：

```text
standingKeyFor('cq-os')
standingKeyFor('cq-os-maint')
```

## Step 10

新 session 执行完整 P4 对抗。

## Step 11

如果 Role Runtime 全部通过：

```text
再开启 enforceRoles:true
```

然后重新跑 P4。

## Step 12

执行 cq-os-maint 最小真实升级闭环。

## Step 13

更新：

```text
Memory
ADR
Review
Progress
Tech Debt
Version
CHANGELOG
```

并最终 commit。

---

# 二十一、阶段完成标准

只有以下全部 PASS：

```text
Governance guard fail-closed
Project Policy workspace isolation
Canonical FS enforcement
Role Registry real runtime identity
Baseline Role cannot be relaxed
Baseline Gate cannot be relaxed
policy.yml runtime semantics
LOOP_BREAKER behavior
standingKeyFor('cq-os')
standingKeyFor('cq-os-maint')
Runtime P4 adversarial tests
Maintenance real upgrade dogfood
Full regression tests
Memory 0 unresolved reports
```

才能标记：

```text
Governance + Maintenance = VERIFIED
```

否则状态保持：

```text
PARTIAL / POC / BLOCKED
```

---

# 二十二、最终执行汇报格式

DSH 完成本轮后，只汇报以下内容：

1. 修改文件列表；
2. P0 已解决项；
3. P0 未解决项；
4. `standingKeyFor('cq-os')`；
5. `standingKeyFor('cq-os-maint')`；
6. Project Policy workspace isolation 测试；
7. absolute / traversal / symlink 测试；
8. Role Registry real session 映射结果；
9. Baseline + Project Role merge 测试；
10. Runtime Gate / approval 测试；
11. LOOP_BREAKER 实测；
12. P4 全套权限对抗结果；
13. Maintenance 真实升级结果；
14. 自动测试总结果；
15. Memory index / reports；
16. 是否可标记 `Governance + Maintenance VERIFIED`。

---

# 二十三、最终指令

当前不要再做架构探索。

不要增加功能。

本轮核心：

> 修正 Governance 的真实运行边界，并用最新 standing + P4 + Maintenance dogfood 证明它真的成立。

若遇到相同错误或相同工具循环：

```text
LOOP_BREAKER
→ BLOCKED
→ 根因分析
→ 换方案 / Human
```

禁止重复无信息工具调用。
