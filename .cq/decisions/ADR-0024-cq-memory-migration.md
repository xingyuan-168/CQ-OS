---
id: adr-0024-cq-memory-migration
type: decision
status: accepted
updatedAt: 2026-08-26T21:52:02+08:00
commit: b682356c504b84c7939d7c61bb6c1359b4ee7e4f
title: ADR-0024: CQ Memory 一次性迁移（狗粮课题）
---

# ADR-0024: CQ Memory 一次性迁移（狗粮课题）

## 状态

已接受（Human Gate 通过后生效，V0.2 治理里程碑）。

## 背景

CQ OS 自身 `.cq/` 下 5 个真实记忆文件（ADR-0001、progress、project、tech-debt、versions/0.1.0）缺 front matter，`.cq/index.json` 的 legacy/missing-commit 报告全部来自这 5 条记录；同时 `walk` 把 `.cq/selfcheck/` 下 10 个自检报告也纳入索引（category 未命中 → type/status 均 legacy），基线为 15 records / 29 reports。本 ADR 与 `docs/v2.1-memory-adr-draft.md`（ADR-0021 草案：Git Markdown 权威源 + 可重建派生索引）同源，是 V2.1 Memory 迁移部分的实施决策。

## 决策

1. **复用 `tools/cq-memory-index.mjs` 零依赖索引器**，不引入 DSH storageDomain/SQLite FTS5、不引入任何第三方依赖、不 SQL 化 Memory。触发重新评估的条件（记录 > 万级 / 真正全文检索 / 复杂条件查询 / 多进程并发写）记录在案，B5 后置。
2. **5 个目标文件补 front matter，正文零改动**：仅头部新增 `---` 块（第 1 字节起，LF，无 BOM），正文与头部空一行分隔。
3. **id 采用显式语义化 id**（`adr-0001-cq-os-bootstrap`、`progress`、`project`、`tech-debt`、`version-0.1.0`），弃用路径派生形态；全库无引用，零迁移成本。
4. **commit 语义**：`commit` = 该记忆正文最近实质修改的 commit（`git log -1 --format=%H -- <file>`，迁移前快照）；type=version 特例 = 版本 tag peel 的 commit。**updatedAt 恒等于 commit 字段所指 commit 的作者时间**（`git log -1 --format=%aI <commit>`，ISO 8601 带时区），两字段同源同次更新。
5. **status 词汇表（起点，可扩展）**：`accepted`（decision 已接受）、`active`（project/progress 进行中）、`open`（tech-debt 待处理）、`released`（version 已发布）；`legacy` 为 schema 保留字。`agent`/`tags`/`references`/`summary` 本次全部省略（正文无据，不臆造字段）。
6. **索引器边界修正**：`walk` 跳过名单扩为 `index.json`、`schema`、`validation`、`selfcheck`、`review`——与需求边界"`selfcheck/`、`schema/` 不入记忆 schema"及 Review 落盘目录对齐；同步在 `tools/test-cq-memory-index.mjs` 增加 selfcheck 跳过回归断言。
7. **索引重建**：迁移后 `node tools/cq-memory-index.mjs .` 应得 5 records / 0 reports（C2 后为 7 records / 0 reports）；幂等口径 = 删除 `.cq/index.json` 后重建两次，除 `generatedAt` 外字节一致。
8. **本 ADR 自带 front matter 成为第 6 条合规记忆记录**；`.cq/versions/0.2.0.md` 一并建立（`commit` 指向 tag v0.2.0 peel 的迁移主体 commit）。

## 原因

- 复用现成零依赖索引器：解析、报告、幂等重建已实现并经 PoC 验证（两次重建稳定），避免重复造轮子；研究阶段已排除存储引擎引入的依赖/供应链复杂度。
- 显式语义化 id：路径重命名不再漂移 id；消除派生噪音；front matter 成为唯一权威，符合 `authoritative: markdown`。
- commit/updatedAt 同源：一个 git 命令即可复核，杜绝"时间与提交错位"；版本记录以发布事实（tag peel）为内容基准，与普通记录的"最近实质修改"在更高层统一为"内容基准 commit"。
- selfcheck/review 跳过：这些目录是 git 跟踪的治理工件而非记忆记录，纳入索引只会产生噪音报告并掩盖真实合规状态；skip 名单与既有 schema/ 处理同构，最小改动。

## 约束

- 只补 front matter 头部；正文零改动；不并推 V2 生产化；不臆造字段。
- 迁移 commit 严格只含 front matter + 构建器 skip 修复 + 测试；`.cq/index.json` 为派生产物（gitignored），不入提交。
- tag `v0.2.0` 打在 v2 分支的迁移主体 commit（C1），版本内涵 = Memory schema 一次性迁移完成。

## 替代方案（已放弃）

- **DSH storageDomain / SQLite FTS5**：storage-sqlite 是 KV 非搜索引擎、无 FTS5；当前记录量远未达触发条件（> 万级），放弃。
- **给 selfcheck/review 文件补 front matter**：不在 allowedTypes 内，产生 invalid-type，且违反"不入记忆 schema"边界。
- **索引只收录 category 命中的文件**：更彻底，但会让未知文件静默消失（丧失 legacy 报告的发现价值），行为变更面更大，留待后续演进。
- **commit/updatedAt 取"创建 commit"或"迁移日期"**：创建 commit 使 updatedAt 倒退误导；迁移日期是管理事实且不可复核，均放弃。

## 长期影响与维护约定

1. **两段式提交约定**：正文实质修改时，先提交内容（C_body），随即用 `git log -1 --format=%H/%aI -- <file>` 取得该提交，在**紧随的纯 front matter 提交**中回填 commit/updatedAt 为 C_body；front-matter-only 提交不触发更新。代价是每次正文修改两个提交，换取字段永远准确。
2. **自引用记录**：创建于引用提交之后的记录（如本 ADR、0.2.0.md），其 commit 字段指向内容基线 commit（迁移主体 C1），不指向自身创建提交（hash 无法预知）。
3. 后续新增记忆文件必须自带 front matter；未知类型/未知目录以 legacy 报告显式暴露，作为治理信号而非噪音。
4. B5 结构化 Memory 启动时，本索引 schema 与两段式约定作为迁移输入。

## 回滚

迁移 = 一次性 front matter 新增（正文零改动），`git revert` 或 `git checkout` 目标文件即可；`.cq/index.json` 随时可删重建。构建器 skip 修复同提交回滚。无数据迁移、无外部依赖，回滚成本近零。
