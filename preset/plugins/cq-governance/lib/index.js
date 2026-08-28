// NATIVE_SUBPATH_ENFORCEMENT_GAP (A2): see .cq/tech-debt.md.
//
// The DSH tool-layer hooks (tools.guard / tools/pre-execute) are NOT a kernel
// security boundary. Shell sub-path enforcement is a structural gap: the guard
// matches a conservative literal shell signature only, so variable expansion,
// indirection, `cd X && 写`, symlink indirection, and non-literal variants are
// NOT intercepted. The fallback is role shell gating (authoritative layer) +
// sandbox containment + this A2 record. We never claim "fully intercepted".
//
// @cq/governance — CQ OS governance plugin (ADR-0025 runtime-enforcement upgrade).
// Two enforcement layers via DSH:
//   tools.guard()        monotonic deny — Baseline ∪ Project protected paths
//                        (per mode) + bash/pwsh conservative literal signature.
//   tools/pre-execute    dynamic allow/deny/ask — role capability gate →
//                        gate/approval gate (order not reversible).
//
// This file is the only one that depends on schemastery (the `Config` object).
// The pure logic lives in lib/policy.js / lib/roles.js / lib/core.js so a clean
// clone can unit-test it without the profile's package graph.

import z from '@deepseek-ai/schemastery'
export { name, apply } from './core.js'

// Config is consumed by Cordis `resolveConfig` via `Config["~standard"].validate`.
export const Config = z.object({
  mode: z.union(['runtime', 'maintenance']).default('runtime'),
  policyDir: z.string().default('.cq/policy'),
  enforceRoles: z.boolean().default(false),
})
