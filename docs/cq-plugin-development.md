# CQ OS 插件开发运行手册

> CQ OS 遵循"一切皆插件"（需求二章）。本手册说明如何开发、校验、合成、挂载、使用和卸载一个 CQ Plugin。不建设在线插件市场（V2.3 边界）。

## 一、插件结构

一个 CQ Plugin 是一个预设本地目录，含三要素：

```
cq-plugin-<id>/
├── cq-plugin.yml        # 薄契约（L2）：id/version/compat/contributes/capabilities/lifecycle
├── rows/<fragment>.cordis.yml   # 插件行片段（L0）：真正被组合进 preset 的 row
└── skills/ templates/   # 可选，随插件携带的技能/模板
```

- **L0 = DSH 插件行**：`agent.cordis.yml` 里的一行 `{id,name,config}`，是运行时单元（复用 DSH，不重造）。
- **L1 = npm 语义**：复用 SemVer/exports（本预设暂不 npm 化，用目录形式）。
- **L2 = cq-plugin.yml**：CQ 唯一新增的薄契约（兼容范围、能力声明、生命周期、安全自评估）。

## 二、校验（validate）

```bash
node tools/cq-plugin-validate.mjs <manifest.json> [cqOS] [dsh]
```

fail-closed 拒绝：非法 id、host-plane（`plane: host` 禁止）、缺失 capabilities/lifecycle、空 contributes.rows、不满足的 cqOS/DSH 兼容区间。

## 三、合成（compose，候选 B：创作期合并）

```bash
node tools/cq-plugin-compose.mjs <manifest.json> <base-agent.cordis.yml> [fragmentDir] [cqOSVersion]
```

把插件声明的 rows 片段并入目标 preset 文本，校验行 id 冲突、拒绝 host-plane，产物可 Git review。**它不部署、不触碰部署目录**——产物在 `preset/` 源码内，经 Git review 后再部署。

## 四、挂载（真实挂载验证）

插件行被合成进 preset 后，通过 DSH 预设挂载生效：

1. 将合成产物合入 `preset/agent.cordis.yml`（唯一源码）。
2. 同步部署到用户预设目录（部署产物）。
3. `standingKeyFor('cq-os')` 挂载校验——失败则整份组合被拒，不留半成品。

**已验证**：cq-os 组合在真实 cq-os agent scope `standingKeyFor` 通过、`composed=cq-os`。消费型 row（只调用宿主资源、不发服务）可安全合并。

**边界（isolate/host-plane）**：
- 只发布服务的 row：必须包进 `cordis:group` + `isolate` realm，否则落 process-global、第二次挂载冲突。
- host-plane row（注册表/agent-loop/沙箱/审批/持久化）：插件**禁止**添加。

## 五、使用

插件行挂载后，其工具/技能随 preset 对会话可见。插件声明的 `capabilities` 是**声明**，运行时由 DSH `tools.guard()`/`tools/pre-execute` 执行（不替代运行时权限）。

## 六、卸载

- 从 `preset/agent.cordis.yml` 移除插件行（源码），重新部署。
- 插件创建的文件/目录按 `lifecycle.uninstall` 约定清理。
- 回滚：Git revert 或切换回旧 tag。

## 七、验收门槛（V2.3）

插件能力只有同时满足才算实现：完成开源复用判定 → 许可证/安全/兼容检查 → 最小 PoC → ADR → 离线 validate+compose 通过 → 真实挂载 `standingKeyFor` 通过 → 使用/卸载闭环 → Git/tag/远端同步 → CHANGELOG/.cq/versions/tech-debt 更新。
