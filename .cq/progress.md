# Progress

## Completed

- 需求基线已读取并完成 DSH 扩展点调研。
- Git 仓库初始化，远端配置为 `git@github.com:xingyuan-168/CQ-OS.git`。
- CQ OS 预设源码目录建立。
- 组合文件、技能和工作流模板已完成。
- 已通过官方 AgentPresets API 创建用户预设。
- `standingKeyFor('cq-os')` 真挂载验证成功。
- Git commit、`v0.1.0` tag 和 GitHub 远端推送完成。

## V1 Status

- V1 源码、部署、`standingKeyFor('cq-os')` 真挂载和 Git v0.1.0 已完成。
- 新苍穹模式会话工具目录、Gate A、Gate B 仍需用户在 Web GUI 实测。

## V2 Current

- V2 开源优先计划已获批准并已推送到 `origin/v2`。
- V2.0 已完成开源矩阵、`tools/pre-execute` 拒绝 PoC、生命周期观测 PoC 和 ADR-0020 签署；`tools.guard()`/`fs/write-intent`/`approval` 已确认当前动态 Host 端不可用为强制控制，正式持久治理移到维护预设阶段。
- V2.1 已完成开源调研、schema、零依赖索引脚本和真实仓库重建 PoC；两次重建记录和诊断内容稳定。
- V2.2 已完成 DSH 源码级路由调研、ADR 草案和最小 route-audit 校验；首期采用 DSH 原生 per-agent provider/model；LiteLLM 仅为条件增强。
- V2.3 已完成插件契约/维护模式开源调研、ADR 草案、离线 manifest 校验器和创作期合并器（候选 B）；真实 row/isolate 组合 PoC 尚未完成。

## V2 Remaining

- V2.0：已签署 ADR-0020（首期复用 pre-execute，不引入第三方策略引擎）；Agent-scoped guard、ask 审批、正式 fs intent 和 subagent 委派状态仍需维护预设阶段验证。
- V2.1：按需评估 DSH storageDomain/SQLite FTS5；当前零依赖方案已满足首期索引验收。
- V2.2：完成 DSH 原生 per-agent 路由行为测试；只有跨 provider failover/预算需求成立才启动 LiteLLM PoC。
- V2.3：完成消费型 row、isolate 服务行、松散服务行和 host-plane row 的真实挂载验证；离线 manifest 校验器与创作期合并器已就绪。
