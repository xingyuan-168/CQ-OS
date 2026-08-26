# CQ OS 各角色自检报告（工具 / 权限 / 功能）

> 说明：本文档基于 CQ OS 预设部署后的**真实角色自检**（`docs/agent-role-self-check.md`）整理，列出各角色执行代理由 `maxDepth: 1` + `toolFilter`（allow/deny）决定的工具与权限。工具清单为运行时实际暴露，`report` 为 DSH 派发子代理时自动注入的内建工具（非 preset 配置行）。

## 角色工具过滤原则

- 9 个执行角色统一 `maxDepth: 1`，不得再委派、创建团队、调度。
- `toolFilter` 使用 `deny`（或 `role-review` 使用 `allow`）黑/白名单。
- 通用编排工具 `subagent`、`subagent_fork`、`workflow`、`ralph`、`list_agents`、`send_message`、`interrupt_agent`、其它角色 `subagent_*` 均被 deny。
- `ask_user_question` 已收紧：仅 Core 保留，8 个执行角色 deny，Human Gate 由 Core 触发。
- `report` 为子代理运行时内建，所有被派发角色均有，用于向派发者（Core）提交结果。

---

## 1. Product（产品）

### 工具清单（17 个）
- 文件读取/信息：`read`、`read_image`、`glob`、`grep`、`skill`、`web_search`
- 文件写入：`write`、`edit`
- 目标管理：`create_goal`、`get_goal`、`update_goal`
- 后台任务：`job_list`、`job_output`、`job_kill`
- 规划/汇报：`todo_write`、`exit_plan_mode`、`report`

### 被 deny
`subagent`、`subagent_fork`、`workflow`、`ralph`、`list_agents`、`send_message`、`interrupt_agent`、全部 `subagent_*` 角色工具、`ask_user_question`、`pwsh`

### 权限
- 可：需求分析与理解、产品设计与功能拆解、产出需求/设计文档、读取与分析工作区文件、向 Core 汇报
- 不可：创建团队、组织编排、写实现代码、主导组织结构调整、触发用户提问（Human Gate 由 Core 触发）、执行命令

### 功能清单
需求分析、产品设计、功能拆解、需求说明与产品设计文档产出

---

## 2. Research（研究）

### 工具清单（17 个）
- 文件操作：`read`、`write`、`edit`、`glob`、`grep`、`read_image`
- 后台任务：`job_list`、`job_output`、`job_kill`
- 信息/汇报：`skill`、`web_search`、`report`
- 目标管理：`create_goal`、`get_goal`、`update_goal`、`todo_write`、`exit_plan_mode`

### 被 deny
`subagent`、`subagent_fork`、`workflow`、`ralph`、`list_agents`、`send_message`、`interrupt_agent`、全部 `subagent_*`、`ask_user_question`、`pwsh`

### 权限
- 可：开源项目/技术方案/竞品调研与信息搜集、候选评估（License/活跃度/维护状态/技术栈/匹配度/可复用/可二开/二开成本/维护风险/对比/选与不选）、输出有据结论、记录选择与放弃原因、向 Core 汇报
- 不可：写/改实现代码、执行部署/编译/运行验证、创建团队、做最终决策、触发用户提问、请求沙盒提权、执行命令

### 功能清单
开源项目调研、技术情报收集、竞品/方案对比、评估记录沉淀、决策依据产出

---

## 3. UX（体验设计）

### 工具清单（17 个）
- 文件操作：`read`、`write`、`edit`、`glob`、`grep`、`read_image`
- 信息/汇报：`skill`、`web_search`、`report`
- 目标管理：`create_goal`、`get_goal`、`update_goal`
- 后台任务：`job_list`、`job_output`、`job_kill`
- 规划：`todo_write`、`exit_plan_mode`

### 被 deny
`subagent`、`subagent_fork`、`workflow`、`ralph`、`list_agents`、`send_message`、`interrupt_agent`、全部 `subagent_*`、`ask_user_question`、`pwsh`

### 权限
- 可：用户研究与可用性分析、交互流程与信息架构设计、原型/线框稿、UI/UX 设计审查与反馈、体验一致性、可访问性、设计系统/组件规范建议、向 Core 汇报
- 不可：编写生产实现代码、创建/组建团队、基础设施与 Cordis 插件开发、编辑代理构成/预设、纯后端工作、触发用户提问、执行命令、请求 sandbox 越权

### 功能清单
用户研究、可用性分析、交互流程设计、原型/线框稿、界面体验审查、设计系统与规范建议

---

## 4. UI（界面设计）

### 工具清单（17 个）
- 文件操作：`read`、`write`、`edit`、`glob`、`grep`、`read_image`
- 信息获取/汇报：`web_search`、`report`
- 技能：`skill`
- 目标管理：`create_goal`、`get_goal`、`update_goal`
- 后台任务：`job_list`、`job_output`、`job_kill`
- 规划：`todo_write`、`exit_plan_mode`

### 被 deny
`subagent`、`subagent_fork`、`workflow`、`ralph`、`list_agents`、`send_message`、`interrupt_agent`、全部 `subagent_*`、`ask_user_question`、`pwsh`

### 权限
- 可：界面视觉设计、视觉规范、设计系统落地、组件样式/布局/色彩/排版/响应式/无障碍/交互/动画/图表、阅读审阅界面相关代码与设计资产、向 Core 汇报
- 不可：后端/业务逻辑、Cordis 插件宿主开发、代理预设/组织编排、创建或管理团队、触发用户提问、执行命令

### 功能清单
界面视觉设计、组件样式与交互、设计系统落地、可用性与无障碍

---

## 5. Architect（架构师）

### 工具清单（18 个）
- 文件操作：`read`、`write`、`edit`、`glob`、`grep`
- 命令执行：`pwsh`
- 信息获取：`read_image`、`web_search`
- 技能/汇报：`skill`、`report`
- 目标管理：`create_goal`、`get_goal`、`update_goal`、`todo_write`
- 后台任务：`job_list`、`job_output`、`job_kill`
- 规划：`exit_plan_mode`

### 被 deny
`subagent`、`subagent_fork`、`workflow`、`ralph`、`list_agents`、`send_message`、`interrupt_agent`、全部 `subagent_*`、`ask_user_question`

### 权限
- 可：架构设计、模块/系统结构划分、接口/数据契约定义、技术选型评估与决策、技术调研与对比、数据库/数据模型设计、只读现状分析与方案评审、执行命令（用于只读探测）、向 Core 汇报
- 不可：写实现代码、创建/管理团队、执行实现类工作（编译/构建/部署）、自行扩大任务范围、触发用户提问

### 功能清单
技术选型决策、系统架构设计、模块划分/分层/接口契约、数据模型与数据流设计、方案输出

---

## 6. Developer（开发者）

### 工具清单（16 个）
- 文件操作：`read`、`write`、`edit`、`glob`、`grep`、`read_image`
- 命令执行：`pwsh`
- 技能/汇报：`skill`、`report`
- 目标管理：`create_goal`、`get_goal`、`update_goal`
- 后台任务：`job_list`、`job_output`、`job_kill`
- 规划/信息：`todo_write`、`exit_plan_mode`、`web_search`

### 被 deny
`subagent`、`subagent_fork`、`workflow`、`ralph`、`list_agents`、`send_message`、`interrupt_agent`、全部 `subagent_*`、`ask_user_question`

### 权限
- 可：实现/编码、功能开发、Bug 修复、按设计落地技术方案、在给定工作区内读写文件、执行命令、调用可用技能、向 Core 汇报
- 不可：需求/产品决策、创建或组建团队、配置组织角色、修改治理规则、删除核心数据、修改生产环境、擅自扩大权限、触发用户提问

### 功能清单
代码实现、功能开发、Bug 修复、技术方案落地

---

## 7. Tester（测试）

### 工具清单（18 个）
- 文件操作：`read`、`write`、`edit`、`glob`、`grep`、`read_image`
- 命令执行：`pwsh`
- 信息/汇报：`web_search`、`skill`、`report`
- 目标管理：`create_goal`、`get_goal`、`update_goal`
- 后台任务：`job_list`、`job_output`、`job_kill`
- 规划：`todo_write`、`exit_plan_mode`

### 被 deny
`subagent`、`subagent_fork`、`workflow`、`ralph`、`list_agents`、`send_message`、`interrupt_agent`、全部 `subagent_*`、`ask_user_question`

### 权限
- 可：测试设计与质量验证、缺陷发现与报告、验收/回归测试、性能与安全测试、只读检查代码/产物并输出验证结论、执行命令（用于测试）、向 Core 汇报
- 不可：写业务实现代码、功能开发、创建/删除/修改文件或执行实现类工作、创建团队、创建/修改 Cordis 插件或主机组合、调整核心系统/审批配置、触发用户提问

### 功能清单
测试用例设计（单元/集成/API/UI）、缺陷发现与报告、验收测试、性能/安全/回归测试

---

## 8. DevOps（运维）

### 工具清单（18 个）
- 文件操作：`read`、`write`、`edit`、`glob`、`grep`、`read_image`
- 命令执行：`pwsh`
- 技能/汇报：`skill`、`report`
- 目标管理：`create_goal`、`get_goal`、`update_goal`
- 后台任务：`job_list`、`job_output`、`job_kill`
- 信息/规划：`web_search`、`todo_write`、`exit_plan_mode`

### 被 deny
`subagent`、`subagent_fork`、`workflow`、`ralph`、`list_agents`、`send_message`、`interrupt_agent`、全部 `subagent_*`、`ask_user_question`

### 权限
- 可：环境/Docker/CI-CD/部署/构建/依赖管理等工程化与运维事务、执行 Core 分配的任务、授权范围内读写工作区文件、执行命令、向 Core 汇报
- 不可：产品决策、创建团队、越权运行需批准的受限操作、充当业务/架构决策层、触发用户提问

### 功能清单
构建流程与产物管理、部署与发布、环境管理、CI/CD 流水线、Docker/容器化、依赖管理

---

## 9. Review（评审）

### 工具清单（6 个，纯只读）
- 文件操作（只读）：`read`、`glob`、`grep`
- 信息获取：`web_search`
- 技能加载：`skill`
- 汇报：`report`
- 本会话不存在：命令执行工具、子代理委托工具、目标/后台任务管理工具、写入/编辑/删除文件工具、`ask_user_question`

### 被 deny（`allow` 白名单之外的其余全部）
`allow: [read, glob, grep, skill, web_search]`，其余一律不可见

### 权限
- 可：只读审查架构一致性/安全/性能/可维护性/健壮性、验收结果、输出质量结论与改进建议、用 read/glob/grep 引用证据、向 Core 汇报
- 不可：写/改实现代码、创建/删除文件或目录、建立团队/创建项目、编译/构建/运行、委派任务、执行平台变更（升级/回滚/安装）、触发用户提问

### 功能清单
代码评审、结果验收（通过/不通过结论）、缺陷/风险/反模式识别、改进建议输出

---

## 10. Core（核心协调 · 自检）

### 工具清单（33 个）
- 文件操作：`read`、`write`、`edit`、`glob`、`grep`、`read_image`
- 命令执行：`pwsh`
- 角色子代理委托：`subagent`、`subagent_product`、`subagent_research`、`subagent_ux`、`subagent_ui`、`subagent_architect`、`subagent_developer`、`subagent_tester`、`subagent_devops`、`subagent_review`、`subagent_fork`
- 子代理管理：`send_message`、`interrupt_agent`、`list_agents`
- 大规模编排：`workflow`、`ralph`
- 目标管理：`create_goal`、`get_goal`、`update_goal`、`todo_write`
- 后台任务：`job_list`、`job_output`、`job_kill`
- 信息获取：`web_search`、`ask_user_question`、`skill`
- 模式控制：`exit_plan_mode`

### 权限
- 可：项目管理、规划、Agent 调度、治理门禁、结果验收、恢复与交付；委托全部角色子代理；启动 workflow/ralph 编排；读写工作区文件；按流程修改 preset 真源并部署；触发 Human Gate（`ask_user_question`）
- 不可：未经设计与人门禁直接委托开发；用匿名代理执行关键治理步骤；直接编辑已部署的 preset（须先改 preset/ 再部署）；Git 不可用时使用手动快照/重复目录

### 功能清单
项目管理、规划、Agent 调度、治理门禁、结果验收、恢复、交付

---

## 关键变更说明

- `ask_user_question` 已收紧：仅 Core 保留，8 个执行角色 deny，Human Gate 由 Core 触发。
- `report` 为 DSH 子代理运行时内建工具，所有被派发角色均有，用于向派发者（Core）提交结果；它不在 preset 配置行中显式定义。
- 各角色工具清单与部署后真实自检（`docs/agent-role-self-check.md`）对齐。
