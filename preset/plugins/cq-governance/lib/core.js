// @cq/governance — runtime-enforcement assembly. Zero external dependencies.
//
// ADR-0025. Assembles the two enforcement layers for the plugin's `apply`:
//   - `tools.guard()`  — monotonic, non-overridable deny. Branch A: mutating
//     tools only (path/file_path/target hit the effective protected set).
//     Branch B: bash/pwsh conservative literal shell-signature + workdir.
//   - `tools/pre-execute` — dynamic allow/deny/ask. Two waterfall listeners,
//     registered in this exact order (not reversible):
//       1. roleCapabilityGate  — role capability deny (enforceRoles only).
//       2. gateApprovalGate    — cannot categories + gates -> ask/deny.
//     Role deny outranks gate ask because roleCapabilityGate runs first.
//
// `enforceRoles` (default false) turns the role capability gate on/off. The
// authoritative layer this round is the spawn toolFilter (see preset/
// agent.cordis.yml); role enforcement is staged until P4 validates the
// roleRegistry correlation (Core Review #4).

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

// Waterfall listener #1 — role capability gate (deny priority). Runs first.
// Returns a deny decision, or `next()` to continue (allow/fall-through).
export function roleCapabilityGate({ registry, roles, enforceRoles }) {
  return (exec, next) => {
    if (!enforceRoles) return next() // role gating off this round
    const role = registry.roleOf(exec)
    // UNKNOWN -> deny-default: capability object is {} => canWrite and
    // canExecuteCommand are both not-true.
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
export function gateApprovalGate({ registry, mode, gates }) {
  return (exec, next) => {
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
  const policyDir = config.policyDir || '.cq/policy'
  const enforceRoles = config.enforceRoles === true

  // Load policy. fail-closed: loadProjectPaths / loadRoles / loadGates throw on
  // malformed policy, which fails plugin mount rather than degrading.
  const projectProtected = loadProjectPaths(policyDir)
  const effective = effectiveGuard(mode, projectProtected)
  const roles = loadRoles(policyDir)
  const gates = loadGates(policyDir)
  const registry = createRoleRegistry()

  const tools = ctx.get('tools')
  if (tools && typeof tools.guard === 'function') {
    const dispose = tools.guard((exec) => guardDecision(exec, { mode, effective }))
    ctx.effect(() => dispose)
  }

  // Two pre-execute listeners, order fixed: roleCapabilityGate -> gateApprovalGate.
  const preRole = roleCapabilityGate({ registry, roles, enforceRoles })
  const preGate = gateApprovalGate({ registry, mode, gates })
  ctx.on('tools/pre-execute', (exec, next) => preRole(exec, next))
  ctx.on('tools/pre-execute', (exec, next) => preGate(exec, next))

  // Roles built for the caller: the registry + the enforcement switch, so the
  // host surface (spawn tooling) can correlate identities when needed.
  return { registry, mode, enforceRoles, effective, gates, roles, approvalGated: approvalGated(mode) }
}
