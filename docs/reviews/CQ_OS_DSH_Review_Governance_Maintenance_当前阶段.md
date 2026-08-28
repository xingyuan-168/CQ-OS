# CQ OS 当前进度 Review 报告（交 DSH 执行）

版本：Current Review / Governance + Maintenance 阶段  
目的：对当前 CQ OS 实现状态进行收口复核，并指导 DSH 继续修正。  
原则：不推翻现有架构，不扩 Agent，不做模型路由；本轮只完成 Governance + cq-os-maint 的正式落地与验证。

---

# 一、总体结论

CQ OS 当前整体方向正确，不需要重构。

现阶段可以定性为：

> CQ OS V1 核心第五模式、多 Agent、Git、CQ Memory 等能力已基本成立；当前主要缺口集中在 Governance 运行时强制执行、cq-os-maint 正式挂载、Shell/工具绕过、fail-closed 和失败循环熔断。

当前不要继续扩展新能力。

本轮目标只有一个：

> 把已经设计好的 Governance / Maintenance 规则真正变成不可绕过的 Runtime 行为，并完成真实对抗验收。

---

# 二、已确认成立的部分

以下内容不要重复推翻、重做或重新设计：

- `cq-os` 第五用户模式方向成立。
- CQ Core + 9 个专业角色方向成立。
- Git 是唯一版本管理方式。
- `preset/` 是 CQ OS 唯一 Source of Truth。
- CQ Memory 使用项目根目录 `.cq/` 的方向成立。
- Memory Schema / Index 当前状态良好。
- 最新重建结果已达到：
  - 11 records
  - 0 reports
- Workflow 绕过正式角色的问题此前已修正。
- 开源优先调研流程已形成。
- `@cq/governance` 插件已进入开发/安装/loader 修正阶段。
- `cq-os-maint` 已有源码骨架。
- 模型路由继续暂停。
- 不扩 Agent。

---

# 三、P0：Governance 尚未真正接入日常 cq-os Runtime

## 当前问题

当前仓库中的：

```text
preset/agent.cordis.yml
```

尚未正式包含 `@cq/governance` plugin row。

因此当前状态只能描述为：

```text
Governance Plugin 已开发
→ 安装/loader PoC 已进行
→ 但尚未成为 cq-os standing preset 的正式组成部分
```

不能描述为：

> “日常 cq-os 已经由 Governance Runtime 强制治理。”

## 必须完成

将 `@cq/governance` 正式接入：

```text
preset/agent.cordis.yml
```

然后执行：

```text
Source preset
→ deploy
→ standingKeyFor('cq-os')
→ 新 cq-os session
→ Runtime 对抗测试
```

## 验收标准

必须在真实新会话中证明：

- Governance Plugin 已挂载。
- Guard / pre-execute 真正在 Runtime 生效。
- 不只是单元测试通过。
- 不只是动态临时插件 PoC 成功。
- 不只是模块可以 import。

---

# 四、P0：当前路径 Governance 可能被 Shell 绕过

## 当前问题

Governance 当前主要从工具参数中提取类似：

```text
path
file_path
target
```

进行 protected path 判断。

但 Shell 工具通常通过：

```text
command
workdir
```

执行。

因此可能出现：

```text
文件写工具写 preset/**
→ DENY
```

但：

```text
bash / pwsh / shell
→ echo / Set-Content / cp / mv / rm
→ 修改 preset/**
```

没有被 protected-path guard 正确识别。

## 重要原则

不要自研一个复杂 Shell 命令解析器。

禁止走以下路线：

```text
正则解析 Bash / PowerShell
→ 猜命令最终会改哪个文件
```

这不可靠，也会变成第二套安全系统。

## 正确处理方向

优先调查和组合 DSH 原生能力：

- tool capability boundary
- sandbox
- workspace isolation
- toolFilter
- role-level shell capability
- pre-execute / guard
- 必要时为危险角色移除直接 shell 写能力

如果 DSH 当前无法表达“workspace 内部某些子路径不可写”，必须明确记录：

```text
NATIVE_SUBPATH_ENFORCEMENT_GAP
```

不得伪称已经实现完全路径 RBAC。

## 必须新增对抗测试

至少测试：

```text
fs write preset/**
bash 写 preset/**
pwsh 写 preset/**
absolute path 写 preset/**
../preset/** traversal
symlink 间接写 protected path
.env
credentials/**
.cq/policy/**
.dsh/**
```

## 验收标准

只有所有主要写路径均无法绕过 protected policy，才能标记为 Hard Governance PASS。

---

# 五、P0：fail-closed 语义尚不完整

## 当前问题

Project Policy 加载异常时，当前部分逻辑可能退化为：

```text
catch
→ []
→ 只使用 Baseline
```

这不能完全满足已冻结要求：

> 策略存在但损坏 / 解析失败时必须 fail-closed。

## 必须区分三种情况

### 情况 1

项目根本没有 Project Policy：

```text
Project Policy ABSENT
→ Baseline Policy 生效
```

允许。

### 情况 2

Project Policy 存在且合法：

```text
Baseline + Project
→ monotonic merge
```

允许。

### 情况 3

Project Policy 存在但损坏 / 无法读取 / schema 不合法：

```text
DENY / MOUNT FAIL / BLOCKED
```

必须 fail-closed。

禁止：

```text
损坏
→ 当作没有策略
→ 继续运行
```

---

# 六、P0：双层 Policy 目前还不是完整 Governance Policy

## 当前问题

当前实际强制执行主要集中在：

```text
protected-paths
```

但仓库中已经定义：

```text
roles.yml
gates.yml
policy.yml
```

这些内容尚未全部进入 `@cq/governance` Runtime enforcement。

因此当前准确状态是：

> Protected Path 双层 Policy 已进入实现，完整角色权限 + Gate Governance 尚未完成。

## 必须完成

`@cq/governance` 必须真正消费：

```text
Baseline Role Policy
Project Role Policy
Protected Path Policy
Gate Policy
Global failClosed/defaultDeny settings
```

---

# 七、P0：Role Policy 不能只存在于 YAML

例如：

```text
Tester:
canWrite: false
```

如果 Tester 实际仍拥有 Shell / 文件修改工具，那么：

```text
roles.yml
```

只是声明，不是硬治理。

必须把角色策略映射到 Runtime。

建议语义：

```text
Baseline hard deny
→ tools.guard()

Role / task / gate decision
→ tools/pre-execute

需要人类确认
→ ask / approval stack
```

## 原则

`tools.guard()`：

用于不可突破的系统级 deny。

`tools/pre-execute`：

用于：

```text
allow
deny
ask
```

等动态策略。

不要把所有治理逻辑都塞进一个 path guard。

---

# 八、P0：Human Gate 尚未完全成为硬 Governance

当前已定义：

```text
design approval
frontend approval
production release
dangerous operations
```

但这些 Gate 不应仅由 persona / prompt 自觉执行。

本阶段至少需要让关键高风险动作进入 Runtime Gate：

```text
production deploy
修改治理规则
高风险删除
force/reset
CQ OS 自升级部署
```

这些动作在 Maintenance Mode 中也必须要求 Human Approval。

---

# 九、P0：必须补 LOOP_BREAKER

最近已真实发生两次执行循环：

```text
“用临时插件验证 cq-os-maint 挂载”
重复执行
```

以及：

```text
“读 Cordis 1605-1645 行”
重复执行
```

说明当前 CQ OS 的失败恢复规则仍不完整。

目前：

```text
有限重试
→ 重新委派
→ Git rollback
→ Human
```

不足以处理 Tool / Reasoning Loop。

## 必须增加 LOOP_BREAKER

至少加入：

### Rule 1

相同 Tool + 相同参数：

```text
最多执行 1 次
```

### Rule 2

相同目标 + 等价参数：

```text
最多允许 2 次
```

第二次必须是“方案发生变化”的真正重试。

### Rule 3

连续多次工具调用没有新增信息：

```text
LOOP_BREAKER_TRIGGERED
```

### Rule 4

触发后：

```text
停止继续调用工具
→ 状态 BLOCKED
→ 总结已知事实
→ 根因分析
→ 换方案
→ 必要时 Human Intervention
```

## 必须修改

至少检查：

```text
preset/skills/cq-lifecycle/SKILL.md
preset/skills/cq-governance/SKILL.md
CQ Core persona
.cq/tech-debt.md
```

## 当前阶段要求

先实现“规则层 Loop Breaker”。

后续如果 Governance 能稳定计数，再考虑 Runtime Tool Loop Counter。

当前不要为了 Loop Breaker 另造复杂框架。

---

# 十、P0：cq-os-maint 尚未正式完成

## 当前状态

`cq-os-maint` 已有源码骨架，但当前不能标记为完成。

必须完成真实：

```text
AgentPresets.copy('standard', 'cq-os-maint', ...)
→ deploy
→ standingKeyFor('cq-os-maint')
→ 新 Maintenance session
```

并确认：

- 不挂完整 `tool-cordis`
- 不复制 9 个软件工程角色
- 只保留维护所需窄权限
- Maintenance Policy 已接入
- 可修改 CQ OS Source of Truth
- 高风险行为仍需要审批

---

# 十一、P0：Maintenance Mode 不得成为“无限权限模式”

`cq-os-maint` 可以比日常模式权限高，但不能无治理。

建议两套 Policy：

## Runtime Policy

用于 `cq-os`：

严格禁止：

```text
preset/**
.cq/policy/**
.env
credentials/**
.dsh/**
```

以及 CQ OS 自修改行为。

## Maintenance Policy

用于 `cq-os-maint`：

允许：

```text
修改 preset/**
执行 CQ OS 升级验证
deploy
standingKeyFor
```

但以下动作仍需 Human Approval：

```text
修改 Governance Baseline
修改治理规则
production deploy
force/reset
危险删除
破坏性 Git 操作
Source of Truth 大范围重构
```

---

# 十二、P1：Generic / Fork 二次调度绕过仍需最终收紧

此前已经发现：

```text
Core
→ Generic/Fork
→ 其他 Agent
```

理论上仍可以形成非 Core 调度链。

当前可以继续列技术债，不要求因此打断 Governance 主线。

但正式 1.0 Hardening 前必须处理：

```text
Generic/Fork maxDepth
Generic/Fork toolFilter
Generic/Fork named subagent visibility
workflow / team / ralph controls
```

最终原则仍是：

> CQ Core 是唯一正式组织者。

---

# 十三、P1：Governance 插件仓库测试依赖不完整

当前解压后的干净仓库运行 Governance 插件测试时，出现：

```text
ERR_MODULE_NOT_FOUND:
@deepseek-ai/schemastery
```

这不等于真实 Profile 安装失败。

但说明当前仓库尚不能：

> clone → install/test → 全量回归

建议补：

```text
root package.json
workspace / devDependencies
test bootstrap
```

确保 Governance Plugin 在独立仓库环境也能稳定测试。

不要依赖“本机 Profile 恰好已经装了某个包”。

---

# 十四、P1：项目状态文档需要同步

检查并修正以下状态漂移：

## `.cq/project.md`

若仍写：

```text
当前版本：0.1.0
```

而当前已经进入 0.2.x，则同步。

## `.cq/tech-debt.md`

若仍写：

```text
未来新增 cq-os-maint
```

而现在 `preset/maintenance/` 已存在，则改成真实状态。

## Maintenance Skill

如果还写：

```text
维护完成后卸载 cq-os-maint
```

建议修正为：

> cq-os-maint preset 可常驻定义；维护完成只退出 Maintenance Session，不必删除维护模式。

---

# 十五、本阶段禁止事项

在 Governance + Maintenance 没有收口前：

禁止继续：

- 模型路由
- 新 Agent
- Plugin Marketplace
- OPA / Cedar / Casbin / Cerbos
- 自研策略语言
- 自研 Shell parser
- 新 Runtime
- 第二套 Agent Framework
- 大规模 UI / 产品扩展
- 为解决当前问题修改 DSH 官方源码
- 手工往 DSH 安装目录 node_modules 塞补丁

---

# 十六、建议执行顺序

严格按以下顺序：

## Step 1

补 LOOP_BREAKER。

先防止 Agent 再次进入无界工具循环。

## Step 2

修 Project Policy fail-closed：

```text
absent != invalid
```

## Step 3

让 Governance Runtime 真正消费：

```text
roles
paths
gates
policy
```

## Step 4

明确 Shell 绕过解决方案。

优先复用 DSH 原生机制。

如果当前 DSH 无法完整表达 subpath protection，明确记录 gap，不伪装完成。

## Step 5

将 `@cq/governance` 正式接入：

```text
preset/agent.cordis.yml
```

## Step 6

部署并执行：

```text
standingKeyFor('cq-os')
```

## Step 7

新 cq-os Session 运行权限对抗：

```text
Developer
Tester
fs
bash
pwsh
absolute path
relative traversal
symlink
.env
credentials
.cq/policy
preset
```

## Step 8

正式创建 / 部署 `cq-os-maint`。

## Step 9

将 Maintenance Policy 正式接入。

## Step 10

执行：

```text
standingKeyFor('cq-os-maint')
```

## Step 11

真实 Maintenance 升级狗粮：

```text
进入 cq-os-maint
→ 检查 Git clean
→ 修改 preset/
→ tests
→ Human Approval
→ commit
→ deploy
→ standingKeyFor
→ 新 cq-os session
→ 验证升级成功
```

---

# 十七、本阶段最终验收矩阵

| 项目 | PASS 条件 |
|---|---|
| Loop Breaker | 同一工具/目标不再无限重复，能进入 BLOCKED |
| Governance Mount | `@cq/governance` 正式存在于 cq-os standing composition |
| Fail Closed | Policy 存在但损坏时拒绝运行/执行 |
| Baseline Policy | 项目不能放宽系统 Baseline |
| Role Policy | Tester/Review/Developer 等实际权限与 Policy 一致 |
| Protected Paths | fs + shell 等主要路径无法绕过 |
| Human Gate | 高风险动作可触发 approval |
| Runtime Mode | cq-os 不可修改 CQ OS 自身 |
| Maintenance Mode | cq-os-maint 可受控修改 preset/ |
| Maint Governance | maint 不是无限权限模式 |
| standing cq-os | `standingKeyFor('cq-os')` PASS |
| standing maint | `standingKeyFor('cq-os-maint')` PASS |
| Upgrade Dogfood | maint 能完成一次真实升级闭环 |
| Regression | 当前所有旧测试 + 新 Governance tests 全 PASS |
| Docs/Memory | progress / ADR / tech debt / version / review 已同步 |

---

# 十八、什么时候可以宣布本阶段完成

只有以下全部成立：

```text
Governance 正式挂载
+
Role Policy 实际执行
+
Protected Path 主要绕过路径关闭
+
fail-closed
+
Human Gate
+
Loop Breaker
+
cq-os-maint standing
+
Maintenance Policy
+
真实维护升级闭环
```

才能把：

```text
Governance + Maintenance
```

标记为：

```text
IMPLEMENTED / VERIFIED
```

否则必须保持：

```text
PARTIAL
POC
BLOCKED
```

不能因为文档、插件源码或单测存在就提前标记完成。

---

# 十九、执行报告要求

处理完成后不要输出长篇过程记录。

最终只汇报：

1. 本轮实际修改的文件；
2. 哪些 P0 已解决；
3. 哪些 P0 仍 BLOCKED；
4. `standingKeyFor('cq-os')` 结果；
5. `standingKeyFor('cq-os-maint')` 结果；
6. Shell / FS 对抗测试结果；
7. fail-closed 测试结果；
8. Human Approval 测试结果；
9. LOOP_BREAKER 是否生效；
10. Maintenance 真实升级是否完成；
11. 全部自动测试结果；
12. 是否可以将 Governance + Maintenance 标记为 VERIFIED。

---

# 二十、最终指令

不要重构 CQ OS。

不要继续做下一阶段功能。

当前优先级是：

> 将既有治理设计转化为真实、不可绕过、可验证的 Runtime 行为。

如果遇到 DSH 当前版本能力限制：

```text
先证明限制
→ 记录兼容性/能力 gap
→ 保留现有 PoC
→ 不修改官方源码硬顶
→ 不无限重试
```

若同一 Action + 同一错误重复出现：

```text
立即 LOOP_BREAKER
→ BLOCKED
→ 根因总结
→ 切换方案 / Human
```

本轮完成后，再进入模型路由阶段。
