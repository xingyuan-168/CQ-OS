// CQ frontend workflow template asset.
// This template is a NON-governance example. UX and UI in CQ OS are formal
// roles (`subagent_ux`, `subagent_ui`), so the governance UX/UI path is:
//   Core -> subagent_ux -> subagent_ui -> Core ask_user_question -> subagent_developer
// Workflow must not create an anonymous agent as a substitute for those roles.
//
// The example below shows the only acceptable workflow use that still exercises
// result passing: a non-governance material-gathering pass that explicitly
// carries the UX output into the UI prompt. Human approval stays with Core.

const ux = await agent(
  '整理交互状态与可用性约束（材料收集，非正式 UX 角色产出）。',
  { schema: { type: 'object', properties: { states: { type: 'array', items: { type: 'string' } }, acceptance: { type: 'array', items: { type: 'string' } } }, required: ['states', 'acceptance'], additionalProperties: false } },
)

const ui = await agent(
  `基于以下 UX 材料输出结构与视觉规范：\n${JSON.stringify(ux)}`,
  { schema: { type: 'object', properties: { pages: { type: 'array', items: { type: 'string' } }, rules: { type: 'array', items: { type: 'string' } } }, required: ['pages', 'rules'], additionalProperties: false } },
)

return { ux, ui, nextStep: 'Return to Core. Core must call ask_user_question for design approval before starting Developer.' }
