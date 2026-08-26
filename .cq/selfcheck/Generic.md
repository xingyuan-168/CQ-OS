# 通用 subagent 自检报告

> 本文件由通用 subagent(Generic)于一次"只读 + 最小探测"自检中创建。先以最小内容(角色名 + `probe-written-ok`)验证写入权限,随后按输出格式要求替换为本完整报告(与最终汇报内容一致)。

## 1. 工具清单

本 agent 运行时函数列表快照中共 35 个工具。标记含义:`[已确认]` = 本次自检实际调用过;`[存在未探测]` = 工具在列表中但本次未调用;`[不存在]` = 本次运行时可确认不在工具列表;`[无法验证]` = 无法确认其存在或行为。本次自检中无工具标记为 `[不存在]` 或 `[无法验证]`。

| # | 工具 | 状态 | 说明 |
|---|------|------|------|
| 1 | `ask_user_question` | [存在未探测] | 在工具列表中;本次无需要向用户确认的事项,未调用 |
| 2 | `create_goal` | [存在未探测] | 在工具列表中;本次任务禁止创建目标,未调用 |
| 3 | `edit` | [存在未探测] | 在工具列表中;本次任务禁止改动已有文件,未调用 |
| 4 | `exit_plan_mode` | [存在未探测] | 在工具列表中;当前不在计划模式,未调用 |
| 5 | `get_goal` | [存在未探测] | 在工具列表中;未调用 |
| 6 | `glob` | [已确认] | 探测 b:查找 `*.md`,返回 41 个文件 |
| 7 | `grep` | [已确认] | 探测 d:搜索 `TODO`,返回 11 处匹配 |
| 8 | `interrupt_agent` | [存在未探测] | 在工具列表中;未启动任何后台 agent,未调用 |
| 9 | `job_kill` | [存在未探测] | 在工具列表中;无后台任务,未调用 |
| 10 | `job_list` | [存在未探测] | 在工具列表中;未调用 |
| 11 | `job_output` | [存在未探测] | 在工具列表中;未调用 |
| 12 | `list_agents` | [存在未探测] | 在工具列表中;未调用 |
| 13 | `pwsh` | [已确认] | 探测 a:`echo probe-ok-Generic` 成功 |
| 14 | `ralph` | [存在未探测] | 在工具列表中;本次任务禁止使用,未调用 |
| 15 | `read` | [已确认] | 探测 c:读取 `.cq\selfcheck\Research.md` 成功 |
| 16 | `read_image` | [存在未探测] | 在工具列表中;本次无图片需读取,未调用 |
| 17 | `report` | [已确认] | 自检末尾向派发者(父 agent)提交报告时调用 |
| 18 | `send_message` | [存在未探测] | 在工具列表中;未调用 |
| 19 | `skill` | [存在未探测] | 在工具列表中;技能目录在会话快照中可见(见 §2.f),本次任务不匹配任一技能,未实际加载 |
| 20 | `subagent` | [存在未探测] | 在工具列表中;本次任务禁止派发 agent,未调用 |
| 21 | `subagent_architect` | [存在未探测] | 在工具列表中;未调用 |
| 22 | `subagent_developer` | [存在未探测] | 在工具列表中;未调用 |
| 23 | `subagent_devops` | [存在未探测] | 在工具列表中;未调用 |
| 24 | `subagent_fork` | [存在未探测] | 在工具列表中;未调用 |
| 25 | `subagent_product` | [存在未探测] | 在工具列表中;未调用 |
| 26 | `subagent_research` | [存在未探测] | 在工具列表中;未调用 |
| 27 | `subagent_review` | [存在未探测] | 在工具列表中;未调用 |
| 28 | `subagent_tester` | [存在未探测] | 在工具列表中;未调用 |
| 29 | `subagent_ui` | [存在未探测] | 在工具列表中;未调用 |
| 30 | `subagent_ux` | [存在未探测] | 在工具列表中;未调用 |
| 31 | `todo_write` | [已确认] | 用于维护本次自检任务清单 |
| 32 | `update_goal` | [存在未探测] | 在工具列表中;未调用 |
| 33 | `web_search` | [已确认] | 探测 e:1 次查询成功,返回来源链接 |
| 34 | `workflow` | [存在未探测] | 在工具列表中;本次任务禁止使用,未调用 |
| 35 | `write` | [已确认] | 探测 g:创建 `.cq\selfcheck\Generic.md`(本文件)成功 |

## 2. 探测结果

按任务指定步骤逐项执行,每项只跑一次:

- **a. pwsh**:已执行。命令 `echo probe-ok-Generic`,输出 `probe-ok-Generic`,退出正常。✓
- **b. glob**:已执行。在工作区 `D:\dsh-projects\CQ OS` 下按 `*.md` 查找,成功返回 41 个 Markdown 文件,含 `README.md`、`docs\*.md`、`preset\skills\*\SKILL.md`、`.cq\project.md`、`.cq\selfcheck\Research.md`、`.cq\selfcheck\Developer.md`、`.cq\selfcheck\Architect.md` 等。✓
- **c. read**:已执行。读取 glob 结果之一 `.cq\selfcheck\Research.md`(共 77 行,本次读取前 40 行,为同批角色自检报告),内容正常返回。✓
- **d. grep**:已执行。在 `*.md` 文件中搜索 `TODO`,成功返回 11 处匹配,全部位于 `docs\agent-role-self-check.md`(其中第 23 行正是 `.cq/selfcheck/Generic.md` 的预期产出记录)。✓
- **e. web_search**:已执行,共 1 次查询 `DeepSeek Harness`。连通成功,返回 8 个来源链接(节选):[DataCamp 教程](https://www.datacamp.com/zh/tutorial/deepseek-harness)、[DoNews: DeepSeek 正式开源 Harness](https://www.donews.com/news/detail/1/6670452.html)、[36氪深度体验](https://www.36kr.com/p/3938143940820104#1)、[至顶网](https://www.zhiding.cn/ai-applications/2026/0820/3196866.shtml)、[ITHOME](https://m.ithome.com/html/989446.htm#1#1) 等。✓
- **f. skill**:技能目录可见。会话快照列出 3 个技能:`cordis-plugin-development`、`editing-cordis-compositions`、`ui-ux-pro-max`。`skill` 工具本身未调用(本次任务不匹配任一技能描述)。✓(目录可见;工具本体未探测)
- **g. 写入权限**:已执行。`write` 直接创建 `D:\dsh-projects\CQ OS\.cq\selfcheck\Generic.md`(即本文件),首次尝试即成功,无需创建目录、无需重试。先写入最小内容(角色名 + `probe-written-ok`),随后按输出格式要求替换为本完整报告。✓

## 3. 权限情况

- **(i) 文件访问策略(可见)**:运行时快照载明 `Current DSH file policy: workspace-write`,即可修改会话工作区 `D:\dsh-projects\CQ OS` 下的文件;"一些平台临时区域也可能可写"。本次实测:工作区内创建新文件成功。
- **(ii) 工作区之外读写**:未探测(只读审计,未主动越界尝试)。策略文字仅授权工作区与平台临时区,工作区外是否被实际阻止无法从观察确认 → 无法验证。
- **(iii) 审批行为(可见)**:运行时快照载明 `Approval prompts are disabled in this session`——审批提示被禁用,需要审批的操作会被自动拒绝,且禁止请求沙箱升级(不得设置 `sandbox_permissions`);本 agent 为委派 subagent,权限范围在启动时固定,本会话内不可扩大。本次自检未触发任何审批请求,审批流程本身未实测。
- **(iv) 沙箱/受限语言(观察)**:本次 `pwsh`(echo)在 workspace-write 模式下正常执行,未触发受限语言报错。工具说明载明 read-only 模式下 pwsh 运行于 PowerShell ConstrainedLanguage(仅核心类型,`.NET` 静态调用被阻止),但本会话为 workspace-write,且我未执行 .NET 调用类命令,故 ConstrainedLanguage 的具体限制未实测 → 未观察部分无法验证。

## 4. 角色职能清单

作为通用委派 agent,可执行以下通用职能(按本次已确认/可确认的工具标注):

| 职能 | 状态 | 依据 |
|------|------|------|
| 信息检索/联网研究 | [可以] | `web_search` 已确认(1 次查询连通成功) |
| 文件读取 | [可以] | `read` 已确认 |
| 文件查找/内容搜索 | [可以] | `glob`、`grep` 已确认 |
| 文件创建/写入 | [可以] | `write` 已确认(探测 g 成功) |
| 命令执行(PowerShell) | [可以] | `pwsh` 已确认 |
| 任务规划/进度追踪 | [可以] | `todo_write` 已确认 |
| 向父 agent 汇报 | [可以] | `report` 已确认(末尾调用) |
| 文件编辑(已有文件) | [未验证] | `edit` 存在但未调用;本次禁止改动已有文件 |
| 技能加载 | [未验证] | `skill` 存在、目录可见(3 个技能),未调用 |
| 委派子 agent | [未验证] | `subagent` 及 9 个角色子 agent 工具存在;本次任务禁止派发,未调用 |
| 后台任务/agent 管理 | [未验证] | `job_list`、`job_output`、`job_kill`、`interrupt_agent`、`list_agents`、`send_message` 存在;本次未启动后台任务 |
| 目标管理 | [未验证] | `create_goal`、`get_goal`、`update_goal` 存在;本次任务禁止创建目标,未调用 |
| 大规模编排 / 新鲜 agent 迭代 | [未验证] | `workflow`、`ralph` 存在;本次任务禁止,未调用 |
| 用户提问 | [未验证] | `ask_user_question` 存在;subagent 场景未调用 |
| 图片读取 | [未验证] | `read_image` 存在;本次无图片需读取 |
| 计划模式 | [未验证] | `exit_plan_mode` 存在;当前非计划模式 |

## 5. 未能验证 / 限制

- 未探测工作区之外的读写;无法确认工作区外是否被阻止(只读审计,未尝试)。
- PowerShell ConstrainedLanguage / .NET 静态调用限制未实测(未执行相应命令);仅有工具说明文字与本次 echo 正常执行的观察。
- `web_search` 仅验证 1 次查询的连通性;多查询、结果质量、异常行为未验证。
- `skill` 工具未调用,技能名仅来自会话快照;技能加载与执行行为无法验证。
- `subagent` 系列、`workflow`、`ralph`、目标工具、后台任务工具、`ask_user_question`、`read_image`、`edit`、`exit_plan_mode` 均存在但未调用,其实际行为无法验证。
- 审批流程未实测:审批提示被禁用(自动拒绝),无法触发真实审批请求;审批行为仅来自运行时快照文字。
- 未改动任何已有文件(含 `.cq\selfcheck\Research.md`、`Developer.md`、`Architect.md` 等同批自检文件);`edit` 对已有文件的操作能力未验证。
- 事实观察:同目录 `Research.md` 报告其运行时工具为 17 个且无 `pwsh`,而本 agent 运行时为 35 个且含 `pwsh`——不同 agent 的工具集不同(仅记录事实,不作结论)。
- glob 返回 41 个 `*.md`(工具说明:较大结果仅返回修改时间排序的前 100 个;41 < 100,应视为完整,但未单独复核)。
- 未验证 `read` 对大文件的分页读取行为(本次仅读取 40 行小文件)。

Reported by Generic subagent.
