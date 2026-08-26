// CQ project-startup workflow template asset.
// Core reads this file and passes the script to the native workflow tool.
// Human approval is intentionally handled by Core after this workflow returns.

const requirements = await agent(
  '作为 Product Agent，分析输入项目需求，输出范围、约束、验收标准和未决问题。',
  { schema: { type: 'object', properties: { scope: { type: 'string' }, constraints: { type: 'array', items: { type: 'string' } }, acceptance: { type: 'array', items: { type: 'string' } }, openQuestions: { type: 'array', items: { type: 'string' } } }, required: ['scope', 'constraints', 'acceptance', 'openQuestions'], additionalProperties: false } },
)

const research = await agent(
  '作为 Research Agent，调研 GitHub、官方生态、成熟行业方案和类似产品，输出调研项目、选择原因、放弃原因和最终建议。',
  { schema: { type: 'object', properties: { projects: { type: 'array', items: { type: 'string' } }, selected: { type: 'array', items: { type: 'string' } }, rejected: { type: 'array', items: { type: 'string' } }, recommendation: { type: 'string' } }, required: ['projects', 'selected', 'rejected', 'recommendation'], additionalProperties: false } },
)

const decision = await agent(
  '作为 Architect Agent，基于需求分析和开源调研输出技术决策、替代方案、风险和 ADR 草案。',
  { schema: { type: 'object', properties: { decision: { type: 'string' }, alternatives: { type: 'array', items: { type: 'string' } }, risks: { type: 'array', items: { type: 'string' } }, adr: { type: 'string' } }, required: ['decision', 'alternatives', 'risks', 'adr'], additionalProperties: false } },
)

const design = await agent(
  '作为 Architect/UX/UI 协作阶段，基于前序结果输出系统设计、用户流程、接口边界和实现拆分。不要开发代码，等待 Core 的人工确认。',
  { schema: { type: 'object', properties: { architecture: { type: 'string' }, flow: { type: 'string' }, interfaces: { type: 'array', items: { type: 'string' } }, implementationPlan: { type: 'array', items: { type: 'string' } } }, required: ['architecture', 'flow', 'interfaces', 'implementationPlan'], additionalProperties: false } },
)

return { requirements, research, decision, design }
