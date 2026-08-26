# CQ OS 治理策略策略说明

本目录定义 CQ OS 的治理策略（路径级权限、角色权限、门禁、受保护路径、例外）。V2.0 的目标是从 V1 的软约束升级为基于 `tools.guard()` / `tools/pre-execute` 的可验证控制。

## 文件

- `policy.yml`：治理总开关与默认策略（allow 默认 vs deny 默认、fail-closed 语义）。
- `roles.yml`：各角色的能力声明（可执行工具、可访问资源、可修改范围）。
- `protected-paths.yml`：禁止修改/删除的高危路径（如 `preset/`、`.cq/policy/`、凭证、生产配置）。
- `gates.yml`：关键阶段的确认门禁（设计确认、Human Gate 等）。
- `exceptions.yml`：允许的例外（临时放行，需审计）。

## 语义

- 所有策略 fail-closed：配置损坏、校验失败、无法决策时一律拒绝，不默认放行。
- 策略是声明，运行时由 DSH `tools.guard()` / `tools/pre-execute` 消费。本目录的 `.yml` 仅作为权威声明源，由 `tools/cq-policy.mjs` 校验其结构合法。
- 每项策略变更需更新 `.cq/decisions/` 并关联 commit，可追踪。

> 本目录为基准结构。实际策略内容由阶段 5 落地时填充，当前仅提供合法占位与校验依据。
