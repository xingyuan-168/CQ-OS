# CQ Memory 一次性迁移（狗粮课题）评审结论

- 评审日期：2026-08-26
- 评审角色：Review（只读）+ Core 复核
- 评审对象：分支 `v2`，HEAD = `3f6da098`（C3）
  - C1（迁移主体）：`b682356c504b84c7939d7c61bb6c1359b4ee7e4f` — 5 文件 front matter + 构建器 skip 修复 + 测试
  - C2（收尾记录）：`1c3a77997638984b7152273030f2a7c8a8b5e25b` — ADR-0024 / versions/0.2.0 / CHANGELOG / progress 正文
  - C3（元数据跟随）：`3f6da098f8c4cf348300b6d635ff55b34820a507` — progress front matter 两段式回填

## 结论：通过

Review 判定"有条件通过"（本会话无 shell 工具，正文零改动与作者时间两项留待 Core 机械复核）；Core 复核命令结果全部一致，条件满足，结论升级为**通过**。无 P0/P1 问题。

## 验收标准逐项结论（docs/dogfood-cq-memory-migration.md）

| # | 验收标准 | 结论 | 证据 |
|---|---|---|---|
| 1 | legacy/missing-commit 不再为主 | ✅ | `node tools/cq-memory-index.mjs .` → 7 records / 0 reports；7 条记录 type 全在 allowedTypes、status≠legacy |
| 2 | 索引可删并从 Markdown 幂等重建 | ✅ | 删 `.cq/index.json` 重建两次，除 generatedAt 外字节一致（Tester 实测） |
| 3 | 5 文件补 front matter，正文未丢失 | ✅ | `git diff a123e48 C1 -- <5文件>` 纯新增 46 行、0 删除；字节级"front matter + 旧 blob"拼接比对一致；LF、无 BOM |
| 4 | Human Gate：迁移方案经 ask_user_question 确认后实施 | ✅ | 5 项决策全部获批（推荐项）；ADR-0024 status=accepted 落盘为旁证 |
| 5 | Review 结论落盘 .cq/review/，关联 commit | ✅ | 本文件；关联 C1（主）+ C2/C3（记录） |
| 6 | 完整五阶段产出物 | ✅ | docs/requirements-analysis.md、open-source-research.md、technical-decisions.md、v2.1-memory-adr-draft.md 等 + 本课题 ADR-0024 + 三提交 |
| 7 | standingKeyFor('cq-os') 挂载 + 回归全过 | ✅ | 挂载记录于 progress.md（v0.1.0 已验）；回归套件 4 项全过（memory-index/test-contracts/plugin-compose/dead-name） |

## 审查明细（Review 实证 + Core 复核）

- **schema 合规**：7 条索引记录与 `.cq/schema/memory-schema.yml` required 四字段 / allowedTypes / legacyStatus 语义完全一致；front matter 与索引逐字段一致；`reports: []`。
- **源完整性**：5 个迁移文件正文零改动（front matter 纯增量块）；progress.md 的 C2 闭环更新（1 处 V2.1 状态原位替换 + 1 行完成记录）与 ADR-0024/CHANGELOG/0.2.0.md/C2 消息四方一致，属预期。
- **Git 历史连续性**：`3f6da09 → 1c3a779 → b682356 → a123e48` 线性单父链；C1/C2/C3 构成与提交消息、ADR-0024 文档化口径逐字吻合；自引用约定（ADR-0024/0.2.0.md 的 commit=C1、updatedAt=C1 作者时间 2026-08-26T21:52:02+08:00）正确；两段式提交约定（C2 改正文 → C3 纯 front matter 回填 C2 时间 21:52:47）完整落地。
- **ADR-0024 质量**：决策/原因/约束/替代方案/长期影响/回滚六节齐全；与 `docs/v2.1-memory-adr-draft.md`（ADR-0021 草案）同源一致；"两段式提交约定"经 C2→C3 实战验证可执行。
- **构建器修改**：`tools/cq-memory-index.mjs` skip 名单 = index.json/schema/validation/selfcheck/review，不误伤 decisions/executions/versions；`tools/test-cq-memory-index.mjs` selfcheck 断言有效。
- **范围边界**：零第三方依赖（全库无 package.json）；未 SQL 化；`preset/` 未动；未改官方 shipped preset；未并推 V2 生产化。
- **补充核查**：`git rev-parse v0.1.0^{commit}` = `935b238a…`（bootstrap），version-0.1.0 记录 commit 字段与 ADR"version 特例 = tag peel"语义一致。

## 问题清单（P3 观察项，不阻断）

1. 记录超前声明：progress.md/0.2.0.md 在 C2/C3 即记载"Review 落盘 + tag/push"，由 Core 在 Git 闭环使其成真（本文件落盘 + tag v0.2.0 + push 完成）。
2. 自引用记录可复核性：ADR-0024/0.2.0.md 的 commit 指向 C1 而其文件创建于 C2，`git log -1 -- <file>` 无法复现该字段——ADR 长期影响 #2 已文档化此例外。
3. 测试未覆盖 review 目录 skip：建议后续补 `.cq/review/` 夹具回归。
4. Human Gate 与 standingKeyFor 挂载证据在会话/GUI 侧，仓库内以 ADR status 与 progress.md 记录为旁证。

## 关联 commit

- 主关联：C1 `b682356c504b84c7939d7c61bb6c1359b4ee7e4f`（迁移主体）
- 记录关联：C2 `1c3a77997638984b7152273030f2a7c8a8b5e25b`（ADR/version/changelog/progress 闭环）、C3 `3f6da098f8c4cf348300b6d635ff55b34820a507`（元数据两段式回填）
