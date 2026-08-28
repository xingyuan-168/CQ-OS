---
id: adr-0025-governance-runtime-enforcement
type: decision
status: accepted
updatedAt: 2026-08-28T10:00:00+08:00
commit: null
title: ADR-0025: @cq/governance 运行时强制升级（Runtime-Enforcement Upgrade）
tags: [governance, runtime, maintenance, adr]
---

# ADR-0025: @cq/governance 运行时强制升级

## 0. 决策摘要

在既有 fail-closed 受保护路径 guard 之上，把 `@cq/governance` 升级为**双钩子 + 角色/门禁消费**的运行时治理。硬约束（Review 第十五章）：

1. 不改架构、不自研 Shell 命令解析器、不引 OPA/Cedar/Casbin/Cerbos、不改 DSH 官方源码。
2. **工具层职责切分**：
   - `tools.guard()`：单调不可覆盖 deny，装 Baseline+Project 受保护路径（按 mode 收缩）+ shell `command` 保守字面命中。
   - `tools/pre-execute`：动态 allow/deny/**ask**，装角色能力、cannot 类别、门禁、维护审批项。`ask` 自动路由 `approval.request`；无 seam 时 fail-closed 退化为 deny。
3. 角色身份：`exec.agent` 无机器可读角色名 → spawn toolName + subagent/start FIFO 关联建 roleRegistry；**任何模糊/未登记一律 UNKNOWN→deny-default**。
4. 诚实标注残余风险：工具层钩子不是内核安全边界；shell 子路径强制是结构性 gap（`NATIVE_SUBPATH_ENFORCEMENT_GAP (A2)`），兜底=角色 shell 门禁 + 沙箱 containment + gap 记录。禁止宣称"已完全拦截"。
5. 实证锚点（Research 结论，勿重复验证）：`prepareExecution` 先 pre-execute 后 guard（guard 晚且不可覆盖）；guard 沿 agent 链传播；`serviceAsk` 无 approval seam→deny；fs 写工具参数 `file_path`，bash/pwsh 参数 `command`/`workdir`；Cordis `resolveConfig` 仅消费 `Config["~standard"].validate(config)`；沙箱模式仅根级白名单（A2）。

## 1. Core 评审修订（相对 Architect 草案的变更，具有最高效力）

1. **§7 依赖方案改为 (b') 模块拆分**（不采纳手写零依赖 `~standard`）：
   - `lib/policy.js`（纯逻辑：patternMatches/normalizePath/shellSignature/normalizeCommand/loadProjectPaths/loadRoles/loadGates/effectiveGuard/approvalGated/cannotMap/BASELINE_PROTECTED_PATHS）——零依赖。
   - `lib/roles.js`（roleRegistry：observeSpawn/correlateStart/roleOf/UNKNOWN 降级）——零依赖。
   - `lib/core.js`（`export const name='cq-governance'`；`export function apply(ctx,config)` 装配 guard+pre-execute）——零依赖。
   - `lib/index.js`（`export {name,apply} from './core.js'` + schemastery `Config` + A2 头注释）——唯一依赖 schemastery 的文件。
   - 理由：保留已实证可挂载的 schemastery Config（生产挂载零新风险），同时干净克隆可跑纯逻辑测试（只 import policy/roles/core）。
2. **guard 分支 (A) 仅限 mutating 工具**：受保护路径语义=禁止修改/删除（protected-paths.yml 注释原文），`read`/`glob`/`grep` 等读工具不因 `file_path` 命中被拒。shell 分支保留字面包含（误拦读命令为已知代价，记录不静默）。
3. **角色关联防错配**：并发 spawn 未消费队列 >1、FIFO 顺序错位等任何模糊 → UNKNOWN → deny-default；绝不猜测错配角色。
4. **角色 enforcement 分阶段**：`Config` 增 `enforceRoles: z.boolean().default(false)`。默认关闭 pre-execute 角色门禁；本轮先把 **spawn toolFilter 与 roles.yml 对齐**（权威层）：tester deny 增 `write,edit`；product/research/ux/ui deny 增 `bash`。待 P4 真实会话验证 roleRegistry 关联可靠后，再开 `enforceRoles:true`。
5. ask 的 reason 必须含 toolName + 路径/命令摘要 + role。

## 2. 规格 1：guard 升级（shell 保守字面匹配，非 parser）

- `shellSignature(pattern)`：`preset/**`→`preset/`；`.cq/policy/**`→`.cq/policy/`；`**/credentials/**`→`credentials/`；`**.env`→`.env`；`.dsh/**`→`.dsh/`。
- `normalizeCommand`：`\`→`/`、折叠连续 `/`。不做 token 化/引号/变量展开（那属于 parser，禁止）。
- guard 伪代码：
  ```
  if exec.name in MUTATING_TOOLS:  # write/edit 等
    for key in [path,file_path,target]: 命中→deny
  if exec.name in [bash,pwsh]:
    if command 含任一 shellSignature(受保护 pattern) → deny
    if workdir 命中 → deny
  ```
- 残余风险（如实声明）：变量展开、间接路径、`cd X && 写`、symlink 间接写、非字面变体——拦不住。兜底：角色 shell 门禁（权威）+ 沙箱 containment + A2 gap 记录。**不宣称完全拦截**。

## 3. 规格 2：pre-execute 分层

注册顺序（优先级从高到低）：`roleCapabilityGate`（deny）→ `gateApprovalGate`（ask→approval seam，无 seam→deny）。`ask` reason 写全上下文。

cannot 映射（roles.yml → 工具/路径/层）：
- `modify-governance-rules`：write/edit + shell 字面；路径 `.cq/policy/**`、`preset/plugins/cq-governance/**`、`preset/skills/cq-governance/**`、`preset/maintenance/**`、`preset/agent.cordis.yml` → pre-execute **deny**。
- `delete-core-data`：delete 类 + shell `rm`/`Remove-Item -Recurse` 子串；路径 `.cq/**`、`preset/**`、`**/credentials/**` → **ask**。
- `modify-production`：shell 子串 `git push`/`--force`/`git reset`/`deploy`/`kubectl apply`/`terraform apply`/`npm publish`；路径 `**/production*`、`**/.env.production` → **ask**。

## 4. 规格 3：roles.yml 运行时映射（含分阶段开关）

- roleRegistry：根 scope 监听 `subagent_<role>` 派发 + `subagent/start` FIFO 关联（childSessionId→role）；root（delegationDepth 0）→`core`；`exec.agent` 缺失→仅 guard。
- 查询失败/模糊 → UNKNOWN → deny-default（canWrite=false, canExecuteCommand=false, cannot=all）。
- 权威层=spawn toolFilter（本轮对齐）；纵深层=pre-execute 角色门禁（`enforceRoles` 默认 false，P4 验证后开）。
- tester（canWrite:false, canExecuteCommand:true）shell 写残余：guard 字面 + 沙箱 containment 兜底；可选 read-only 会话沙箱（非默认）。不宣称 tester 完全不可写。

## 5. 规格 4：gates.yml 运行时接入

- `production-release`：shell 部署/force/reset 子串（§3 modify-production 同族）→ **ask**；精确发布语义靠 persona+审批。**只能粗拦截，如实标注**。
- `design-approval` / `frontend-approval`：GateState（sessionId→{designApproved,frontendApproved}），gate 未通过时 spawn `subagent_developer`/写实现代码 → ask；未登记=未通过。**部分自动，GateState 是软信号**。
- `gates.yml` 的 `tool: ask_user_question` 保留为无 seam 回退提示；强制机制=pre-execute ask→approval.request。
- 按 D2 决策（全量），gates.yml 增 `dangerous-ops`、`governance-rule-change` 两门。

## 6. 规格 5：maintenance mode

| 动作 | runtime | maintenance |
|---|---|---|
| 写 preset/** | guard deny | 允许 |
| 改治理文件（.cq/policy/**、插件/skill/预设组合） | guard deny | **ask** |
| 写 .env/credentials/.dsh/** | guard deny | guard deny（不可批） |
| deploy/force/reset/危险删除/生产发布/自升级 | **ask** | **ask** |

## 7. 规格 6：A2 gap 三处登记

`.cq/tech-debt.md`（`NATIVE_SUBPATH_ENFORCEMENT_GAP (A2)` 条目）+ `lib/index.js` 文件头注释 + 本 ADR。对抗清单 A2 项标 BLOCKED，Hard Governance 最高 PARTIAL。

## 8. 规格 7：P1-13 测试可运行性（见修订 #1）

干净克隆 `node --test`（或 `node tools/test-*.mjs`）跑 policy/roles/core 纯逻辑套件；`lib/index.js`（schemastery Config）仅在 Profile 内验证（已实证 `~standard.validate` 形态正确）。根 `package.json` 仅加测试引导，不引私有包。

## 9. 修改文件清单

| 文件 | 改动 |
|---|---|
| `preset/plugins/cq-governance/lib/policy.js`（新） | §2/§3 纯逻辑 |
| `preset/plugins/cq-governance/lib/roles.js`（新） | roleRegistry |
| `preset/plugins/cq-governance/lib/core.js`（新） | name + apply 装配 |
| `preset/plugins/cq-governance/lib/index.js` | 收敛为 Config+re-export+A2 注释 |
| `preset/plugins/cq-governance/package.json` | 保留 schemastery peer；exports 不动 |
| `preset/plugins/cq-governance/test/`（新）或 `tools/test-cq-governance-*.mjs` | §10 单测（import core/policy，零依赖） |
| `preset/agent.cordis.yml` | 加 `@cq/governance` row（runtime）；tester deny 增 `write,edit`；product/research/ux/ui deny 增 `bash` |
| `preset/maintenance/agent.cordis.yml` | 加 `@cq/governance` row（maintenance） |
| `.cq/policy/gates.yml` | 增 `dangerous-ops`、`governance-rule-change` |
| `.cq/tech-debt.md` | A2 + ROLE_IDENTITY_ASSOCIATION_GAP |
| 根 `package.json`（新） | 测试引导 |

## 10. 测试计划

单测（零依赖）：fs 写命中/放行；shell 字面命中/过拦截记录/变量展开→放行且断言 A2 记录；角色映射（UNKNOWN deny-default）；cannot 三类；fail-closed 三态；maintenance 提升；ask 无 seam→deny；gate 子串。
真实对抗清单（P4，用户执行）：fs/bash/pwsh/absolute/`../`/symlink/.env/credentials/.cq/policy/.dsh；symlink 间接写、`cd X && 写`、变量展开 → BLOCKED（A2）。

## 11. 验收标准（对齐 Review 第十七章）

1. guard 硬拒：runtime 下 write/edit 对 5 类受保护路径 DENY；shell 字面命中 DENY。
2. fail-closed：策略损坏 → mount fail/throw。
3. 角色映射：toolFilter 与 roles.yml 对齐（本轮权威层）；enforceRoles 开关可开（P4 验证后）。
4. Human Gate：部署/force/reset/危险删除/改治理规则触发 approval（无 seam→deny）。
5. maintenance：preset/** 可写；治理/部署/force/reset 必须 ask；.env/credentials/.dsh 硬拒。
6. A2 三处登记；BLOCKED 项不伪装 PASS。
7. P1-13：干净克隆零依赖套件全过。
8. 零越界：未改 DSH 官方源码、未引第三方引擎、未自研 shell parser。

## 12. 与 Review 矩阵映射

Governance Mount→§9 row；Fail Closed→§10；Baseline→§2 单调并集；Role Policy→§4 分阶段；Protected Paths→§2+A2 BLOCKED；Human Gate→§3/§5；Runtime/Maintenance Mode→§6；standing→P3 部署验证；Upgrade Dogfood→P4.5；Regression→既有 7 项+新套件；Docs/Memory→§7+本 ADR+progress。
