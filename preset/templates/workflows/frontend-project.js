// CQ frontend workflow template asset.
// UX/UI orchestration ends here. Core must call ask_user_question separately.
// Do not place a human gate inside this script.

const ux = await agent(
  '作为 UX Agent，设计用户流程、信息架构、交互状态和可用性验收标准。不要开发代码。',
  { schema: { type: 'object', properties: { userFlows: { type: 'array', items: { type: 'string' } }, states: { type: 'array', items: { type: 'string' } }, acceptance: { type: 'array', items: { type: 'string' } } }, required: ['userFlows', 'states', 'acceptance'], additionalProperties: false } },
)

const ui = await agent(
  '作为 UI Agent，基于 UX 结果输出页面结构、视觉规范、组件清单和响应式规则。不要开发代码。',
  { schema: { type: 'object', properties: { pages: { type: 'array', items: { type: 'string' } }, visualRules: { type: 'array', items: { type: 'string' } }, components: { type: 'array', items: { type: 'string' } }, responsive: { type: 'array', items: { type: 'string' } } }, required: ['pages', 'visualRules', 'components', 'responsive'], additionalProperties: false } },
)

return { ux, ui, nextStep: 'Return to Core. Core must call ask_user_question for design approval before starting Developer.' }
