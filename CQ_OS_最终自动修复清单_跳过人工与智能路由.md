# CQ OS 最终自动修复清单（交 DSH 执行）

版本：Final Automated Hardening  
用途：由 DSH 在当前仓库中继续完成最后一轮自动修复与收口。  
范围说明：

- **跳过所有必须由用户本人实施的 GUI / Human Gate / 人工审批 / 人工观察步骤。**
- **完全跳过智能模型路由。**
- 其余能够由 DSH 自动完成、自动测试、自动提交、自动记录的修复全部执行。
- 不扩 Agent，不重构 CQ OS，不新造 Runtime，不修改 DSH 官方源码。

---

# 一、本轮最终目标

本轮只做：

> Governance + Maintenance + Project Memory + Version / Docs + Plugin Contract + Project Init + Security Automation + 组织规则的最终自动收口。

目标状态：

```text
CQ OS
→ 可作为稳定 Beta 使用
→ 现有自动治理能力完成收口
→ 仓库状态一致
→ 自动测试完整
→ 自动化初始化/安全检查具备基础能力
→ 剩余 USER_ACTION 项明确挂账
→ 智能路由继续 DEFERRED
```

---

# 二、明确跳过的内容

## 2.1 用户本人实施项

以下本轮不执行，只登记为：

```text
PENDING_USER_VALIDATION
```

包括：

- Gate A GUI 真人确认
- Gate B GUI 真人确认
- Human Approval 真实交互
- 需要用户点击确认的 Maintenance 部署
- 需要用户本人观察的 Web GUI 行为
- 真实生产环境发布
- 用户主观 UI / UX 设计确认
- 任何必须依赖人工现场判断的验收

DSH 不要因这些项目阻塞本轮自动修复。

## 2.2 智能模型路由

以下全部跳过：

```text
V2.2 Model Routing
provider/model route
served-model verification
dynamic complexity routing
cost routing
latency routing
multi-model fallback
```

状态保持：

```text
DEFERRED WITH ADR
```

不得继续扩展。

---

# 三、P0：Governance 缺 `tools.guard()` 时必须 fail-closed

## 当前要求

Governance Runtime 依赖 hard guard。

如果：

```text
ctx.get('tools').guard
```

不可用：

禁止静默继续。

## 修复

改成：

```text
guard unavailable
→ throw
→ governance mount/apply failure
```

不能：

```text
guard unavailable
→ skip
→ continue
```

## 测试

新增：

```text
missing guard
→ FAIL
```

---

# 四、P0：Project Policy 必须绑定 Agent Workspace

## 目标

Project Policy：

```text
<current-agent-workspace>/.cq/policy/
```

不得长期依赖：

```text
process.cwd()
```

## 修复

Runtime Policy 加载必须从当前：

```text
session.header.cwd
```

或 DSH 当前等价 workspace / fs root 获取。

多项目、多 session 必须隔离。

## Mount-time 行为

若 mount 时没有明确项目 workspace：

```text
只验证 Baseline Policy
```

不要用 Host `process.cwd()` 冒充项目。

第一次真实 Agent 执行时：

```text
resolve workspace
→ load Project Policy
→ validate
→ fail-closed
```

## 测试

建立 A/B 两个临时 workspace：

```text
A/.cq/policy/
B/.cq/policy/
```

确认策略不串项目。

---

# 五、P0：Canonical Protected Path 收口

## 目标

修复：

```text
absolute path
./
../
canonical path
symlink
```

等路径绕过。

## 原则

不要自研完整路径安全框架。

优先使用 DSH 原生：

```text
ctx.fs.resolve()
ctx.fs.contains()
```

或当前版本等价接口。

## 两层治理

```text
Layer 1:
raw / normalized glob quick deny

Layer 2:
canonical filesystem resolve
→ protected root check
```

任意一层 deny：

```text
DENY
```

## 必测

```text
preset/x
./preset/x
src/../preset/x
absolute-path/preset/x
.cq/policy/x
.env
credentials/x
.dsh/x
symlink -> protected path
```

---

# 六、P0：Shell Governance 保持工程边界，不造 Shell Parser

## 当前原则

不实现：

```text
Bash parser
PowerShell parser
command AST security engine
```

## 自动修复要求

完成能够可靠做的部分：

- literal protected path 检查
- known dangerous command 检查
- role toolFilter
- sandbox / workspace boundary
- protected filesystem canonical enforcement

对于：

```powershell
$p='preset'
Set-Content "$p\x"
```

这种复杂动态 Shell 解析绕过：

继续记录：

```text
NATIVE_SUBPATH_ENFORCEMENT_GAP
```

状态：

```text
KNOWN_LIMITATION
```

不要为了追求 100% 阻断自研 Shell 安全语言。

---

# 七、P0：Role Registry Runtime Wiring

## 目标

确保：

```text
subagent_developer
→ child session
→ role=developer
```

是真实 Runtime 关联，不是只有单测函数。

## 修复

正式监听：

```text
named subagent spawn
subagent/start
```

使用当前 DSH 实际事件 payload。

重点确认：

```text
info.id
```

或当前版本真实 child agent/session id。

禁止继续依赖未经验证的：

```text
childSessionId
sessionId
```

## 测试

真实自动 spawn：

```text
developer
tester
review
architect
```

确认 registry 能准确映射角色。

若 UNKNOWN：

```text
fail-closed
```

不得自动给予高权限。

---

# 八、P0：补 Core Baseline Role

内置 Baseline Role 必须至少包含：

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

Core 权限不得依赖项目 `.cq/policy/roles.yml` 是否存在。

Project Policy 只能收紧 Core。

---

# 九、P0：Baseline Role + Project Role 单调合并

## 基本原则

Project Policy：

```text
只能收紧
不能放宽
```

## 布尔权限

例如：

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

Project 缺失该字段：

```text
使用 Baseline
```

Baseline false：

Project 永远不能变 true。

## cannot / deny

```text
Baseline ∪ Project
```

## allow scope

取更小范围。

## approval required

取更严格的一方。

## 必测

Project：

```yaml
tester:
  canWrite: true
```

Baseline：

```text
tester.canWrite=false
```

Effective 必须：

```text
false
```

---

# 十、P0：Baseline Gate + Project Gate 单调合并

## 自动化范围内需要治理的 Hard Gate

本轮自动实现/完善：

```text
production deploy
governance modification
dangerous delete
force/reset
CQ OS self-upgrade deploy
dangerous git operations
```

## 工程流程 Gate

以下保持 Process Gate：

```text
design approval
frontend approval
major architecture approval
major DB approval
large refactor approval
```

由于本轮跳过用户人工交互：

状态统一记录：

```text
PROCESS_GATE_IMPLEMENTED
RUNTIME_HUMAN_VALIDATION_PENDING
```

Project 不得取消 Baseline 要求的 Gate。

---

# 十一、P0：`policy.yml` Runtime 语义收口

## 推荐方案

不要把：

```yaml
failClosed: true
defaultDeny: true
```

作为允许项目放宽的配置。

直接定义为 Baseline Security Invariant：

```text
FAIL_CLOSED = true
DEFAULT_DENY = true
```

Project Policy 不允许覆盖为 false。

## `policy.yml`

可保留：

```text
policyVersion
project-specific metadata
additional restrictions
```

但安全基线不可配置关闭。

## 文档同步

明确：

> default deny / fail closed 是 CQ Governance 的系统基线，而不是项目可选开关。

---

# 十二、P0：Role Enforcement 分阶段开启

## 当前要求

如果：

```yaml
enforceRoles: false
```

仍存在，则不要直接粗暴切 true。

先完成：

```text
roleRegistry runtime wiring
Core baseline role
baseline/project role merge
UNKNOWN fail-closed
role tests
```

全部 PASS 后：

再开启：

```yaml
enforceRoles: true
```

然后自动回归。

如果真实 DSH 当前版本存在不可解决的 identity gap：

保持 false，记录：

```text
ROLE_RUNTIME_ENFORCEMENT_BLOCKED
```

但 toolFilter 继续作为主角色权限边界。

---

# 十三、P0：LOOP_BREAKER 自动规则收口

LOOP_BREAKER 已进入规则。

本轮增加自动测试。

## Rule

```text
Same tool + same args
→ 不允许重复超过 1 次

Same objective + equivalent operation
→ 最多 2 次

连续多次无新增信息
→ LOOP_BREAKER_TRIGGERED
```

## 触发后

```text
BLOCKED
→ stop tools
→ summarize evidence
→ root cause
→ switch strategy
```

## 测试

模拟：

```text
read same file/same lines
grep same target
equivalent repeated verification
```

确认不会无限循环。

不创建复杂新 Runtime。

---

# 十四、P0：Generic / Fork 调度最终收紧

本轮完成，不再继续挂技术债。

## 目标

```text
CQ Core
→ Generic/Fork
```

允许。

```text
Generic/Fork
→ 再组织 named agents/team/workflow
```

禁止。

## 修复

为 Generic/Fork 设置适当：

```text
maxDepth
toolFilter
named role visibility
workflow
ralph
team controls
ask_user_question
agent-management tools
```

目标：

> CQ Core 是唯一正式组织者。

## 验收

Generic/Fork 不能：

```text
spawn Developer
spawn Research
spawn other Generic
launch workflow/team
```

---

# 十五、P0：Windows toolFilter 真正 smoke-safe

Product / Research / UX / UI 等角色如果 deny：

```text
bash
pwsh
```

必须确认当前 Windows DSH 下这些工具名都属于合法 restrictable tool names。

如果：

```text
bash
```

在当前 scope 中属于 unknown：

不得导致子 Agent startup failure。

## 修复原则

根据平台/真实 tool catalog：

```text
只 deny 实际存在的工具
```

不要再次出现 Cordis dead toolFilter 问题。

## 自动测试

增加：

```text
all named agents toolFilter dead-name check
```

并覆盖 maintenance preset。

---

# 十六、P0：`cq-os` / `cq-os-maint` 自动 standing 验证

如果 DSH 当前自动环境可以调用：

执行：

```text
standingKeyFor('cq-os')
standingKeyFor('cq-os-maint')
```

记录：

```text
source commit
version
timestamp
result
```

如果必须通过用户 GUI 才能完成：

不要阻塞。

标记：

```text
PENDING_USER_VALIDATION
```

并继续其余自动修复。

---

# 十七、P0：Maintenance Mode 自动收口

## `cq-os-maint`

必须保持：

- Standard 为母版
- 不挂完整 tool-cordis
- 不含 9 个软件工程角色
- 只包含维护所需窄权限
- Maintenance Governance 生效
- 可修改 `preset/**`
- 高风险行为仍有 Gate

## 用户审批相关

需要真人确认的动作本轮跳过。

但 DSH 必须完成：

```text
preflight
git clean check logic
tests
validation
deploy preparation
standing validation capability
rollback path
```

并把真人步骤写成：

```text
PENDING_USER_APPROVAL
```

---

# 十八、P1：Plugin Contract 格式统一

## 当前问题

模板：

```text
cq-plugin.yml
```

但 validator 实际可能：

```text
JSON.parse()
```

## 修复

统一使用：

```text
YAML
```

原因：

- CQ Policy 已使用 YAML
- 对人类可读
- 与当前模板一致

## 要求

`cq-plugin-validate.mjs`：

真正支持 YAML。

必要时复用已存在 YAML parser。

不要手写 YAML parser。

## 测试

覆盖：

```text
valid plugin yaml
missing required fields
bad semver
permission invalid
capability invalid
```

---

# 十九、P1：Plugin Contract 保持“薄层”

不要继续扩成：

```text
CQ Plugin Runtime
CQ Marketplace
CQ Package Manager
```

本轮只保证：

```text
manifest
validate
compose
version
permissions declaration
capabilities declaration
```

真正在线 marketplace / hot install：

继续 DEFERRED。

---

# 二十、P1：项目初始化从模板推进到最小自动初始化

## 当前已有

```text
templates/project-init/
```

## 本轮补一个最小自动化入口

例如：

```text
tools/cq-project-init.mjs
```

或当前体系内等价方式。

## 最低功能

生成：

```text
.cq/
.gitignore
README/docs skeleton
Dockerfile
docker-compose
CI skeleton
project metadata
```

Git：

```text
若未初始化
→ git init
```

但如果 Git 不可用：

```text
BLOCKED
```

不要做手工 snapshot fallback。

## 原则

只做通用骨架。

不做几十套语言模板。

---

# 二十一、P1：CI 模板不再只留 README placeholder

补一个最小真实 CI 示例。

至少包含：

```text
install
test
lint/validate
```

具体平台可选择一种主流默认模板。

不要一次做 GitHub/GitLab/Gitee 全套。

---

# 二十二、P1：自动安全扫描基础能力

当前安全规则不应只停留在 prompt。

本轮增加“可选但自动发现”的安全扫描能力。

## 原则

不自研扫描器。

优先检测项目现有工具：

```text
npm/pnpm audit
pip-audit
cargo audit
osv-scanner
gitleaks
semgrep
trivy
```

## 最小实现

增加：

```text
tools/cq-security-check.mjs
```

职责：

```text
detect stack
detect installed scanner
run available mature scanner
normalize result
```

没有扫描器：

```text
SKIPPED_WITH_REASON
```

不要自动安装大量工具。

## 结果记录

写 execution summary / review。

---

# 二十三、P1：CQ Memory execution metadata 优化

Execution front matter 增加：

```yaml
agent:
task:
status:
commit:
version:
startedAt:
completedAt:
```

至少保证：

```text
agent
task
commit
version
```

可以结构化索引。

## Index

支持查询：

```text
某 Agent 最近执行了什么
某任务关联哪个 commit
某版本有哪些 execution
```

仍保持：

```text
Markdown = Source of Truth
index = derived
```

禁止因此上数据库。

---

# 二十四、P1：版本统一

当前必须统一：

```text
preset/VERSION
preset/maintenance/VERSION
.cq/project.md
.cq/versions/
CHANGELOG.md
README.md
Core persona
skills
```

## 规则

选择当前真实版本，例如：

```text
0.3.0
```

但版本号由仓库当前状态决定。

不要随意硬编码。

所有来源必须一致。

---

# 二十五、P1：清理过时 Persona / README / Tech Debt

搜索并修复类似：

```text
未来 CQ Governance Plugin
未来新增 cq-os-maint
path restriction remains soft until future plugin
```

如果真实功能已经存在：

必须更新。

CQ OS 会读自己的 persona / docs / memory。

禁止让旧描述继续污染后续决策。

---

# 二十六、P1：CQ Memory 最终回填

本轮结束前：

```text
commit
→ rebuild index
```

目标：

```text
0 unresolved reports
```

如果某项属于：

```text
PENDING_USER_VALIDATION
DEFERRED_MODEL_ROUTING
KNOWN_LIMITATION
```

应作为合法状态记录，不应被视为 index error。

---

# 二十七、P1：自动回归入口统一

当前已有多组：

```text
tools/test-*.mjs
```

本轮增加一个总入口，例如：

```text
npm test
```

或：

```text
node tools/test-all.mjs
```

## 要求

一次运行：

```text
Governance
Memory
Plugin
Policy
ToolFilter
Project Init
Security Check
Loop Breaker
Maintenance
```

并输出：

```text
PASS / FAIL / SKIPPED
```

---

# 二十八、P1：仓库依赖自足

目标：

```text
git clone
→ install
→ test
```

可完成。

补齐：

```text
root package.json
workspace config
devDependencies
test dependencies
```

不要依赖：

```text
本机 DSH Profile 恰好已有某包
```

---

# 二十九、本轮结束状态分类

每个需求只能使用：

```text
IMPLEMENTED
VERIFIED_AUTOMATED
PENDING_USER_VALIDATION
KNOWN_LIMITATION
DEFERRED
BLOCKED
```

不要再使用含糊：

```text
基本完成
差不多
应该可用
```

---

# 三十、明确继续 DEFERRED 的内容

## 智能模型路由

全部：

```text
DEFERRED
```

## Plugin Marketplace

```text
DEFERRED
```

## 完整路径 Shell 动态语义解析

```text
KNOWN_LIMITATION
```

## 复杂 Gate Engine

```text
DEFERRED
```

## 数据库化 Memory

```text
NOT PLANNED
```

## 第二套 Runtime / Harness

```text
NOT ALLOWED
```

---

# 三十一、推荐执行顺序

严格按顺序：

1. Governance missing guard fail-closed
2. Project Policy workspace isolation
3. canonical FS enforcement
4. Role Registry Runtime wiring
5. Core Baseline Role
6. Baseline + Project Role merge
7. Baseline + Project Gate merge
8. policy baseline semantics
9. Role enforcement验证并决定是否开启
10. LOOP_BREAKER 自动测试
11. Generic/Fork 收紧
12. Windows toolFilter 兼容检查
13. 双 standing 自动验证（能自动则执行）
14. Maintenance 自动能力收口
15. Plugin YAML validator
16. 最小 Project Init 自动化
17. 最小真实 CI
18. Security Check 自动化
19. Memory execution metadata
20. Version / README / Persona / Tech Debt 同步
21. 统一 test-all
22. 全量测试
23. commit
24. rebuild memory index
25. 更新 ADR / progress / review / changelog

---

# 三十二、用户本人实施项处理规则

任何步骤如果必须等待用户：

不要停止整个任务。

改成：

```text
PENDING_USER_VALIDATION
```

并继续执行所有可自动完成的后续项。

例如：

```text
Human Approval
GUI Gate A
GUI Gate B
manual new-session observation
production deploy confirmation
```

只生成清晰待办。

不要反复向用户询问。

---

# 三十三、Loop Breaker 强制规则

本轮执行本身也必须遵守：

```text
同一工具 + 同一参数
→ 最多一次

等价目标重复
→ 最多两次

第二次仍无新证据
→ LOOP_BREAKER

LOOP_BREAKER
→ BLOCKED CURRENT SUBTASK
→ 记录根因
→ 切换方案 / 留待办
→ 继续其它可执行项
```

禁止再次出现：

```text
反复读取同一源码区间
反复验证同一临时插件
反复执行同一 standing
```

---

# 三十四、最终自动验收

DSH 本轮结束前输出：

## Governance

```text
guard fail-closed
workspace isolation
canonical path
role registry
baseline roles
project role cannot relax
baseline gates
project gate cannot relax
```

## Agent

```text
9 named roles config valid
Generic/Fork hardened
dead tool names = 0
```

## Maintenance

```text
maintenance preset config valid
governance maintenance mode valid
automatic standing if possible
```

## Plugin

```text
YAML manifest validate PASS
compose PASS
```

## Project Init

```text
dry-run PASS
temporary project init PASS
```

## Security

```text
scanner detection PASS
normalization PASS
```

## Memory

```text
index rebuild PASS
0 unexpected reports
execution structured metadata PASS
```

## Repository

```text
version consistent
docs consistent
persona consistent
tests PASS
git clean after final commit
```

---

# 三十五、最终报告格式

最终只汇报：

1. 修改文件列表
2. Governance 自动验收结果
3. Role / ToolFilter 结果
4. Maintenance 自动验收结果
5. Plugin Contract 结果
6. Project Init 结果
7. Security Check 结果
8. Memory 结果
9. Version / Docs 一致性结果
10. 全量自动测试数量与结果
11. `PENDING_USER_VALIDATION` 列表
12. `KNOWN_LIMITATION` 列表
13. `DEFERRED` 列表
14. Git commit / tag / push 状态
15. 当前是否可以标记：

```text
CQ OS Beta Automated Hardening Complete
```

---

# 三十六、最终指令

不要继续模型路由。

不要等待用户完成 Human Gate。

不要扩 Agent。

不要重构 CQ OS。

不要修改 DSH 官方源码。

不要自研 Shell parser。

不要引入重型新策略引擎。

本轮目的只有：

> 把除“用户本人验证”和“智能路由”之外，现阶段所有可以由 DSH 自动完成的缺口一次性收口。

完成后停止继续扩展，进入真实项目使用阶段。
