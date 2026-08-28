// @cq/governance — runtime-enforcement assembly. Zero external dependencies.
//
// ADR-0025 + V2 P0-1..P0-8. Assembles the two enforcement layers for `apply`:
//   - `tools.guard()`  — monotonic, non-overridable deny. Branch A: mutating
//     tools only (path/file_path/target hit the effective protected set).
//     Branch B: bash/pwsh conservative literal shell-signature + workdir.
//   - `tools/pre-execute` — dynamic allow/deny/ask. Two waterfall listeners,
//     registered in this exact order (not reversible):
//       1. roleCapabilityGate  — role capability deny (enforceRoles only) +
//                                 spawn observation (always, populates registry).
//       2. gateApprovalGate    — cannot categories + gates -> ask/deny.
//
// V2 P0-1: missing tools.guard -> throw (fail-closed), never silent skip.
// V2 P0-2: Project Policy is bound to the calling agent's session workspace
//   (exec.agent.session.header.cwd) via a per-exec loader cached by root, NOT
//   to process.cwd(). Mount-time loads once for fail-closed validation.
// V2 P0-4: roleRegistry observes subagent_<role> spawns (in roleCapabilityGate)
//   and correlates `subagent/start` events (info.id = child session id,
//   confirmed dsh-tool-cordis index.js:4230) to child identities.
// V2 P0-5/P0-6: roles come from effectiveRoles() (baseline ∪ project, monotonic).
// V2 P0-7: gates from effectiveGates() (baseline gates cannot be cancelled).
// V2 P0-8: policy.yml loaded by loadPolicy() (defaultDeny/failClosed).
//
// `enforceRoles` (default false) turns the role capability gate on/off. The
// authoritative layer this round is the spawn toolFilter; role enforcement is
// staged until P4 validates the roleRegistry correlation (Core Review #4).

import { resolve } from 'node:path'
import {
  MUTATING_TOOLS,
  SHELL_TOOLS,
  effectiveGuard,
  approvalGated,
  patternMatches,
  normalizePath,
  normalizeCommand,
  shellSignature,
  loadProjectPaths,
  loadRoles,
  loadGates,
  loadPolicy,
  effectiveRoles,
  effectiveGates,
  cannotMap,
} from './policy.js'
import { createRoleRegistry, UNKNOWN } from './roles.js'

export const name = 'cq-governance'

// Extract the operation descriptor from an execution.
export function opFromExec(exec) {
  const args = (exec && exec.arguments) || {}
  return {
    tool: exec && exec.name,
    path: args.path ?? args.file_path ?? args.target,
    command: args.command,
    workdir: args.workdir,
  }
}

// Build a human-readable, context-rich ask reason: toolName + path/command
// summary + role (Core Review #5).
function askReason(exec, category, role) {
  const args = (exec && exec.arguments) || {}
  const target = args.path ?? args.file_path ?? args.target
  const command = args.command
  let targetSummary = ''
  if (target != null) targetSummary = `path=${target}`
  else if (command != null) targetSummary = `command=${String(command).slice(0, 60)}`
  const roleName = role === UNKNOWN ? 'UNKNOWN' : String(role)
  return `governance: ${category} requires approval (tool=${exec && exec.name}; ${targetSummary}; role=${roleName})`
}

// Guard decision: return a deny reason string, or undefined to allow.
export function guardDecision(exec, { mode, effective }) {
  const name = exec && exec.name
  const args = (exec && exec.arguments) || {}

  if (MUTATING_TOOLS.includes(name)) {
    const target = args.path ?? args.file_path ?? args.target
    if (target != null) {
      const normalized = normalizePath(target)
      for (const pattern of effective) {
        if (patternMatches(pattern, normalized)) {
          return `governance(${mode}): protected path denied: ${target}`
        }
      }
    }
  }

  if (SHELL_TOOLS.includes(name)) {
    if (typeof args.command === 'string' && args.command.length > 0) {
      const normalized = normalizeCommand(args.command)
      for (const pattern of effective) {
        const sig = shellSignature(pattern)
        if (sig && normalized.includes(sig)) {
          return `governance(${mode}): protected path denied in shell command: ${args.command}`
        }
      }
    }
    if (args.workdir != null) {
      const normalized = normalizePath(args.workdir)
      for (const pattern of effective) {
        if (patternMatches(pattern, normalized)) {
          return `governance(${mode}): protected workdir denied: ${args.workdir}`
        }
      }
    }
  }

  return undefined
}

// Per-execution policy loader (V2 P0-2): bind Project Policy to the calling
// agent's session workspace (exec.agent.session.header.cwd), not process.cwd().
// Cached per root; mount-time apply also loads once for fail-closed validation.
export function makePolicyLoader(config) {
  const mode = config.mode === 'maintenance' ? 'maintenance' : 'runtime'
  const policyRel = config.policyDir || '.cq/policy'
  const fallbackRoot = config.workspaceRoot || process.cwd()
  const cache = new Map()
  const load = (root) => {
    const policyDir = resolve(root, policyRel)
    return {
      root,
      policyDir,
      policy: loadPolicy(policyDir),
      effective: effectiveGuard(mode, loadProjectPaths(policyDir)),
      roles: effectiveRoles(loadRoles(policyDir)),
      gates: effectiveGates(loadGates(policyDir)),
    }
  }
  return (exec) => {
    const root = exec?.agent?.session?.header?.cwd || fallbackRoot
    let entry = cache.get(root)
    if (!entry) { entry = load(root); cache.set(root, entry) }
    return entry
  }
}

// Waterfall listener #1 — role capability gate (deny priority) + spawn observer.
// Runs first. observeSpawn always runs (populates registry regardless of switch);
// the capability deny only applies when enforceRoles is on.
export function roleCapabilityGate({ registry, loader, enforceRoles }) {
  return (exec, next) => {
    const tn = exec && exec.name
    if (tn && /^subagent_[a-z0-9_-]+$/i.test(tn)) {
      try { registry.observeSpawn(tn) } catch { /* fail-closed at correlate */ }
    }
    if (!enforceRoles) return next()
    const { roles } = loader(exec)
    const role = registry.roleOf(exec)
    const capability = roles[role] || {}
    const name = exec && exec.name
    const roleName = role === UNKNOWN ? 'UNKNOWN' : String(role)

    if (MUTATING_TOOLS.includes(name) && capability.canWrite !== true) {
      return { kind: 'deny', reason: `governance: role "${roleName}" cannot write (${name})` }
    }
    if (SHELL_TOOLS.includes(name) && capability.canExecuteCommand !== true) {
      return { kind: 'deny', reason: `governance: role "${roleName}" cannot execute command (${name})` }
    }

    // Role-level cannot deny outranks any gate ask downstream.
    const op = opFromExec(exec)
    for (const cat of capability.cannot || []) {
      const d = cannotMap(cat, op)
      if (d && d.decision === 'deny') {
        return { kind: 'deny', reason: `governance: role "${roleName}" ${d.reason}` }
      }
    }
    return next()
  }
}

// Map registered gates onto ask triggers. Only gates not already covered by the
// cannot categories need this mapping (design/frontend approval gates are soft
// GateState signals, ADR-0025 §5). Returns a reason string or null.
export function gatesDecision(gates, op) {
  if (!gates) return null
  if (gates['governance-rule-change'] && cannotMap('modify-governance-rules', op)) {
    return 'gate:governance-rule-change'
  }
  if (gates['dangerous-ops'] && (cannotMap('delete-core-data', op) || cannotMap('modify-production', op))) {
    return 'gate:dangerous-ops'
  }
  if (gates['production-release'] && cannotMap('modify-production', op)) {
    return 'gate:production-release'
  }
  // design-approval / frontend-approval stay persona-level gates until a
  // GateState registry exists (ADR-0025 §5). No auto-ask here: asking on every
  // mutating tool would over-gate all daily work without real gate state.
  return null
}

// Waterfall listener #2 — cannot categories + gates -> ask/deny. Runs second
// (after roleCapabilityGate), so it never overrides a role deny.
export function gateApprovalGate({ registry, loader, mode }) {
  return (exec, next) => {
    const { gates } = loader(exec)
    const op = opFromExec(exec)
    const role = registry.roleOf(exec)

    // 1. modify-governance-rules: deny in runtime, ask in maintenance (§3/§6).
    const gov = cannotMap('modify-governance-rules', op)
    if (gov) {
      if (mode === 'maintenance') {
        return { kind: 'ask', reason: askReason(exec, gov.reason, role) }
      }
      return { kind: 'deny', reason: `governance: ${gov.reason}` }
    }

    // 2. delete-core-data -> ask (§3).
    const del = cannotMap('delete-core-data', op)
    if (del) return { kind: 'ask', reason: askReason(exec, del.reason, role) }

    // 3. modify-production -> ask (§3).
    const prod = cannotMap('modify-production', op)
    if (prod) return { kind: 'ask', reason: askReason(exec, prod.reason, role) }

    // 4. Registered gates (dangerous-ops / governance-rule-change / ...) -> ask.
    const gateReason = gatesDecision(gates, op)
    if (gateReason) return { kind: 'ask', reason: askReason(exec, gateReason, role) }

    return next()
  }
}

export function apply(ctx, config = {}) {
  const mode = config.mode === 'maintenance' ? 'maintenance' : 'runtime'
  const enforceRoles = config.enforceRoles === true
  const loader = makePolicyLoader(config)
  const registry = createRoleRegistry()

  // Mount-time fail-closed validation: load once (fallback root) so a malformed
  // policy fails mount immediately rather than at first call. Per-call loads are
  // cached by workspace root (V2 P0-2).
  loader({ agent: { session: { header: { cwd: config.workspaceRoot } } } })

  // V2 P0-1: hard guard is mandatory. Missing tools.guard -> fail-closed throw.
  const tools = ctx.get('tools')
  if (!tools || typeof tools.guard !== 'function') {
    throw new Error('governance: tools.guard unavailable — cannot mount without hard guard (fail-closed)')
  }
  const dispose = tools.guard((exec) => {
    const p = loader(exec)
    return guardDecision(exec, { mode, effective: p.effective })
  })
  ctx.effect(() => dispose)

  // Two pre-execute listeners, order fixed: roleCapabilityGate -> gateApprovalGate.
  const preRole = roleCapabilityGate({ registry, loader, enforceRoles })
  const preGate = gateApprovalGate({ registry, loader, mode })
  ctx.on('tools/pre-execute', (exec, next) => preRole(exec, next))
  ctx.on('tools/pre-execute', (exec, next) => preGate(exec, next))

  // V2 P0-4: correlate subagent spawns to child session ids. The
  // `subagent/start` event payload's `info.id` is the child session/agent id
  // (confirmed: dsh-tool-cordis/lib/index.js:4230; dsh-subagent invariant.js:43).
  // Defensive: if the event/payload shape differs, correlateStart -> UNKNOWN.
  ctx.on('subagent/start', (payload) => { try { registry.correlateStart(payload) } catch { /* UNKNOWN */ } })

  return { registry, mode, enforceRoles, loader, approvalGated: approvalGated(mode) }
}
