---
id: tech-debt
type: tech-debt
status: open
updatedAt: 2026-08-28T15:20:00+08:00
commit: c27301a897555f25e4032cf9374b6f904c3bf46c
title: Technical Debt
---

# Technical Debt

## V2 Research Status

- V2 开源优先原则已纳入 `docs/v2-plan.md`。
- V2.0 治理调研完成：首选复用 DSH 原生 guard、pre-execute、fs intent、approval、sandboxPolicy 和 subagent 生命周期；OPA/Cedar/Casbin/Cerbos 暂为二开备选。
- V2.0 PoC 实测结论：`tools/pre-execute` 是当前唯一可用、可重入的工具级硬拦截；`tools.guard()` 在动态 Package 实例缺失（`ctx.get('tools')` 无该方法）；`fs/write-intent` 返回 `undefined` 即继续写入且动态 listener 未覆盖；approval 缺 answerer fail-closed（`unavailable`），但动态 Host 无 `AbortController` 无法实测调用。
- V2.0 ADR-0020 已签署为“首期复用 `tools/pre-execute`，不引入第三方策略引擎”。Agent-scoped guard、ask 审批、正式 Agent-scoped fs intent 和 subagent 委派状态仍需维护预设阶段验证；未完成前不得声明硬 RBAC 已实现。
- **V2.0 阶段1 突破**：`tools.guard()` 在**正式 cq-os agent scope** 可用（`agents.create` + `setup` 挂载 cq-os 后，`agentCtx.get('tools').guard` 为 function，注册成功无报错）；`fs` 服务在 cq-os scope 存在。关闭 ADR-0020 "guard 正确 owner 待定位" 阻塞项。
- **V2.0 阶段5 进展**：`.cq/policy/` 基准结构（policy/roles/protected-paths/gates）+ `tools/cq-policy.mjs` fail-closed 校验器 + `tools/test-cq-policy.mjs` 已落地并提交（842ea57）。
- **V2.2 阶段3 进展**：`.cq/routemap.yml` 模型路由映射声明 + `tools/cq-routemap.mjs` 结构性校验器 + 测试已落地并提交（97f2f01）；真实模型池依赖 DSH settings（非 CQ OS 源码）。
- **V2.3 阶段4 进展**：`tools/test-cq-plugin-e2e.mjs` 端到端（validate+compose+host-plane 拒绝）已落地（4b18cd1）；真实挂载验证确认 cq-os 组合在真实 cq-os agent scope `standingKeyFor` 通过、`composed=cq-os`。
- **Governance 正式接入 PoC（步骤1）**：standing + Core 两层 guard 拦截验证通过（guard 在真实 cq-os agent scope 注册成功，preset/policy/env/credentials/dsh 受保护路径全命中 deny，src/docs 放行）；spawned 角色层由 `tools.guard` 的 agent-chain 语义（`guardReason` 沿 exec.agent 链查）保证，端到端留到步骤 5 对抗测试；DSH CLI 有官方 `dsh plugin --profile` 依赖管理机制（步骤 3 实测 bare package resolution）。
- **Baseline+Project 双层策略（步骤2）**：`tools/cq-baseline.mjs` 内置不可放宽 Baseline Policy（preset/、.cq/policy/、.env、credentials、.dsh/**）；`cq-protect.mjs` 合并 baseline+project=Effective（并集，缺项目文件时 baseline 仍保护 fail-closed）；项目策略只能收紧不能放宽基线。测试 5 项全过（提交 28476c3）。
- **@cq/governance 封装与官方安装（步骤3）**：插件源码 `preset/plugins/cq-governance/`（apply 注册 guard + 双层策略，runtime/maintenance 两模式）；逻辑测试通过（runtime 严格 preset/ 拒绝，maintenance 提升 preset 可写但 env/credentials/.dsh 仍拒）；**官方 `dsh plugin --profile web add` 安装成功，bare package resolution 实测通过**（node_modules/@cq/governance 可解析、exports Config+apply 正确）。

## Deferred

- B1: 日常 CQ OS Runtime 已不挂 tool-cordis（自修改能力默认关闭，非"待关闭"）；cq-os-maint 维护模式已存在，Cordis 权限在维护模式单独设计（见 preset/maintenance/）。
- B2: CQ Governance Plugin，硬策略和路径级 RBAC。
- B3: 第三方插件标准。
- B4: 动态模型路由，并核验子 Agent 实际请求模型。
- B5: 宿主级或结构化 Memory 存储。

## Loop Breaker

- 规则层 LOOP_BREAKER 已落地（cq-lifecycle/cq-governance skill + Core/maint persona）：同工具同参 ≤1 次、等价目标 ≤2 次、无新信息即 BLOCKED。Runtime 工具级 Loop Counter 后置（待 Governance 稳定计数能力）。

## Runtime Gaps

- **NATIVE_SUBPATH_ENFORCEMENT_GAP (A2)** — open：DSH 沙箱只能表达整工作区根级写白名单（read-only|workspace-write|danger-full-access），无法表达"工作区内 preset/** 等子路径只读"。工具层 guard/pre-execute 是 containment 而非内核安全边界；shell 子路径强制不可达，由角色 shell 门禁 + 沙箱 containment + 本记录兜底。影响：受保护子路径对 shell 写只能字面近似拦截。
- **ROLE_IDENTITY_ASSOCIATION_GAP** — open：exec.agent 无机器可读角色名，roleRegistry 依赖 spawn toolName 与 subagent/start 的 FIFO 关联，任何模糊→UNKNOWN→deny-default。关联可靠性需 P4 真实会话验证后才允许开启 enforceRoles。影响：角色级 pre-execute 门禁默认关闭，权威层暂为 spawn toolFilter。**P4 实测（2026-08-28）**：单测覆盖 FIFO 关联/ambiguous→UNKNOWN/P0-4 wiring 全过；developer/tester/review/architect/devops 真实 spawn 行为与 roles.yml 能力一致，未观察 UNKNOWN 错乱；roleRegistry 内部状态本会话不可外读；`enforceRoles` 保持 false，未开启（切换属 preset 变更，P4 用户决定不修）。
- **CANONICAL_FS_LAYER2** — partial：V2 P0-3 canonical 路径强制已实现 Layer 2（async `canonicalGuard` pre-execute 监听，对 mutating 工具经 `ctx.fs.resolve` realpath 校验是否落入 workspace 锚定受保护根 preset/.cq/policy/.dsh，拦截 absolute/traversal/symlink）。范围诚实地限于 workspace 锚定根；`**/credentials/**`、`**.env` 仍由 Layer 1 字符串匹配覆盖；ctx.fs 不可用时 Layer 2 inactive、Layer 1 仍生效（纵深而非主门禁）。A2 shell 残余（变量展开/cd 子命令）仍不可达，对抗项标 BLOCKED。
- **P4-DEADNAME（Windows toolFilter 死名）** — open（P4 实测 FAIL）：role-product/research/ux/ui 的 `toolFilter.deny` 同时含 `pwsh, bash`；win32 上 `tool-bash` disabled、`bash` 非注册全局工具 → `tools.restrict()` 抛 "unknown global tool bash" → 4 角色无法 spawn（重演 Cordis deadname）。死名扫描器 `check-toolfilter-deadnames.mjs` 只查 `cordis_*` 故漏报 `dead:[]`。建议修复：4 个 deny 列表改平台条件式 `!!js process.platform === 'win32' ? 'pwsh' : 'bash'`；扫描器扩展为校验 deny/allow 名解析到当前平台 enabled 工具行。P4 已按用户决定"只记录失败、不修复"，阻塞后续需先解 P4-MAINT-GUARD。
- **P4-MAINT-GUARD（canonicalGuard 模式无关）** — open（P4 实测 FAIL，高优先）：`canonicalGuard`（preset/plugins/cq-governance/lib/core.js）对 MUTATING_TOOLS 硬编码锚定 `['preset','.cq/policy','.dsh']`，不读 mode → maintenance 模式 preset/ 应提升可写但 canonical deny 无条件命中。DSH 流水线 pre-execute `deny` 为终态、不可被审批覆盖（`serviceAsk` 仅 `ask`）→ 无 in-harness 通路。**cq-os-maint 核心职能（写 preset/）整体不可用，并阻塞一切 preset 修复（含 P4-DEADNAME），形成死锁**。单测仅测 Layer 1 guard 未覆盖 canonicalGuard 模式感知。建议修复：canonicalGuard 从 `loader(exec).effective`（=`effectiveGuard(mode)`）派生锚定根，runtime 锚定 preset/.cq/policy/.dsh、maintenance 仅锚定 `.dsh`。
- **P4-PREFLIGHT-MAP（preflight drift 映射误报）** — minor（P4 发现）：`tools/cq-maint-preflight.mjs` 映射 `{src: preset/, dst: cq-os}` 将 `preset/maintenance/**`、`preset/plugins/**` 对照 cq-os 部署目录（实际部署到 cq-os-maint 与插件包），产生 DST_MISSING 误报；部署本身经 hash 校验一致。建议按真实部署目标拆分映射。
- **P4-SHELL-OVERGATE（shell 签名过度拦截）** — 观察（P4 发现）：shell guard 字面签名（`.env`、`.dsh/`、`preset/`、`credentials/` 等）连只读命令只要文本提及受保护路径也会拒（Core 自己的查询命令、Tester 的 `Test-Path` 均被误拦）。保守设计有可操作性代价，需权衡（可能是意图内的 fail-closed 代价）。
- **P4-SHELL-GOV-GATE-GAP（治理规则变更的 shell 门禁缺口）** — open（P4 发现）：maintenance 下 `modify-governance-rules` 对 shell 只匹配 `shellSignature` 非 null 的模式；`preset/agent.cordis.yml` 等精确路径 `shellSignature` 返回 null → 经 shell 写精确治理文件不触发该 approval 门禁。与 A2 同类，建议后续覆盖（shell 写 exact governance path 也应 ask）。
