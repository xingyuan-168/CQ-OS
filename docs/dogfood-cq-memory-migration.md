# CQ OS V1 狗粮闭环启动清单（在 cq-os 会话执行）

> 说明：本清单面向以 `cq-os` 预设启动的 CQ Core 会话。本会话（普通 harness）无角色化委派工具，故狗粮需在 cq-os 会话里跑，以真实验证五阶段治理 + Human Gate + Review 落盘。
> 狗粮课题：CQ OS 自身 `.cq/` Memory schema 一次性迁移。

## 前置确认（已核实）

- `.cq/` 下 5 个真实记忆文件**缺 front matter**：
  - `.cq/decisions/ADR-0001-cq-os-bootstrap.md` → type: decision
  - `.cq/progress.md` → type: progress
  - `.cq/project.md` → type: project
  - `.cq/tech-debt.md` → type: tech-debt
  - `.cq/versions/0.1.0.md` → type: version
- `.cq/schema/memory-schema.yml` 已定义 schema（id/type/status/updatedAt 必填；type ∈ project/decision/progress/execution-summary/bug/preference/tech-debt/version）。
- `tools/cq-memory-index.mjs` 可扫描并生成 `.cq/index.json`，目前报告 legacy/missing-commit（因缺 front matter）。
- `preset/` 为唯一源码，`standingKeyFor('cq-os')` 已通过，部署目录与源码同步。

## 五阶段执行步骤（Core 主导，逐角色委派）

### 阶段1 · 需求分析（委派 `subagent_product`）
Prompt 要点：
- 目标：为 `.cq/` 五个记忆文件补 front matter 元数据、重建可查询索引，使记忆符合 schema。
- 现状：5 文件缺 front matter，`index.json` 报告 legacy/missing-commit。
- 范围：只补头部、不删不覆盖正文；`selfcheck/`、`schema/` 不纳入记忆 schema。
- 产出：需求范围、约束、验收标准（schema 字段/类型/索引可重建）。

### 阶段2 · 开源调研（委派 `subagent_research`）
Prompt 要点：
- 调研"Markdown front matter 元数据 + 派生索引重建"的成熟做法；评估是否值得引入 DSH storageDomain/SQLite FTS5。
- 记录项目/网址/License/活跃/匹配度/复用/二开/组合/自研结论。
- 结论：优先复用 `tools/cq-memory-index.mjs`，零依赖方案，不引第三方库（除非 PoC 证明需 SQL/FTS5）。

### 阶段3 · 技术决策（委派 `subagent_architect`）+ ADR
Prompt 要点：
- 设计迁移方案：逐文件补 front matter 规则、legacy 标记策略、索引重建顺序、Git 历史保持。
- 输出 ADR（影响、替代方案、长期影响）。

### Human Gate（Core 调用 `ask_user_question`）
- 向用户确认迁移方案（字段映射、legacy 策略、自研/复用结论）后才进入开发。

### 阶段5 · 开发（委派 `subagent_developer`）
- 写迁移脚本或手动补 front matter；重建 `.cq/index.json`。
- 不删不覆盖正文；无法推断字段标 `legacy`。

### 阶段6 · 测试（委派 `subagent_tester`）
- 验证 `node tools/cq-memory-index.mjs` 重建后报告大幅下降；索引可删重建且幂等（两次重建记录一致）。

### 阶段7 · 评审（委派 `subagent_review`，只读）
- 审查迁移符合 schema、不破坏源、Git 历史连续。

### Review 落盘（Core）
- 把 Review 结论写入 `.cq/review/`（建议名：`cq-memory-migration-review-<date>.md`），关联 commit。

### Git 闭环（Core）
- commit + tag（如 `v0.2.0`）+ push；更新 CHANGELOG、`.cq/versions/`。

## 验收标准

1. `node tools/cq-memory-index.mjs` 重建后，`legacy`/`missing-commit` 报告不再为主（新记录全部符合 schema；历史少量 legacy 可接受）。
2. 索引可删除并从 Markdown 幂等重建。
3. 5 个记忆文件补 front matter，正文未丢失。
4. Human Gate：迁移方案经 `ask_user_question` 用户确认后实施（证据在会话/记忆）。
5. Review 结论落盘 `.cq/review/`，关联 commit。
6. 完整五阶段有产出物（决策/调研/设计/实现/测试/评审/记忆/Git）。
7. `standingKeyFor('cq-os')` 挂载通过，回归测试（memory-index/test-contracts/plugin-compose/dead-name）全过。

## 范围边界

- 不并推 V2.0/2.2/2.3 生产化；不引入 OPA/Cedar/Casbin/Cerbos、不做路径级 RBAC、不引入数据库化 Memory。
- 不改官方 shipped preset；`preset/` 唯一源码；Git 唯一版本管理。
