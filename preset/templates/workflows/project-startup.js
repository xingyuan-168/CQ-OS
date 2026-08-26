// CQ project-startup workflow template asset.
// This template is NOT a governance path: it must not create anonymous agents
// that bypass the CQ OS professional role system. The governance workflow is:
//   Core -> subagent_product -> subagent_research -> subagent_architect
//        -> Human Gate -> subagent_developer -> subagent_tester -> subagent_review
// Workflow is reserved for parallel research, batch analysis, and non-critical
// path orchestration.
//
// The example below demonstrates the ONLY acceptable use of `agent()` inside a
// workflow: non-governance, parallel research, where each result is explicitly
// carried into the next stage. It never replaces a formal role.

// Research agents are NOT formal roles; they only gather material for Core to
// hand to `subagent_research`. Their results are passed forward structurally.
const researchA = await agent(
  '调研候选方案 A，输出最匹配项与缺口。',
  { schema: { type: 'object', properties: { name: { type: 'string' }, gap: { type: 'string' } }, required: ['name', 'gap'], additionalProperties: false } },
)

const researchB = await agent(
  '调研候选方案 B，输出最匹配项与缺口。',
  { schema: { type: 'object', properties: { name: { type: 'string' }, gap: { type: 'string' } }, required: ['name', 'gap'], additionalProperties: false } },
)

// Fold both results explicitly into the comparison, so the downstream prompt
// sees the real prior output, not a vague reference.
const comparison = await agent(
  `基于以下两项调研结果输出对比结论：\nA=${JSON.stringify(researchA)}\nB=${JSON.stringify(researchB)}`,
  { schema: { type: 'object', properties: { choice: { type: 'string' }, reason: { type: 'string' } }, required: ['choice', 'reason'], additionalProperties: false } },
)

return { researchA, researchB, comparison }
