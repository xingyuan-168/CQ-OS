// @cq/governance — pure policy logic. Zero external dependencies.
//
// This module holds the declarative policy and the pure matching functions for
// the runtime-enforcement upgrade (ADR-0025). It is deliberately free of any
// DSH/Cordis/schemastery import so a clean clone can unit-test it directly.
//
// Two enforcement layers are described here:
//   - `effectiveGuard(mode)`  -> the path set hard-denied by `tools.guard()`
//     (monotonic, non-overridable). In `runtime` it is baseline ∪ project; in
//     `maintenance` preset/** and the governance declarations (.cq/policy/**)
//     are lifted out of the guard (they become writable / approval-gated) while
//     .env / credentials / .dsh/** stay hard-denied.
//   - `cannotMap(category, op)` -> maps the roles.yml `cannot` categories to
//     pre-execute decisions (deny / ask), per ADR-0025 §3.
//
// Shell matching is deliberately a conservative literal-signature match
// (`shellSignature` + `normalizeCommand`), NOT a shell parser. Variable
// expansion, indirection, `cd X && 写`, symlink indirection and non-literal
// variants are NOT caught here — that structural gap is recorded as
// NATIVE_SUBPATH_ENFORCEMENT_GAP (A2) in .cq/tech-debt.md and lib/index.js.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const BASELINE_PROTECTED_PATHS = [
  'preset/**',       // CQ OS sole source of truth
  '.cq/policy/**',   // governance declarations
  '**.env',          // secrets
  '**/credentials/**', // credentials
  '.dsh/**',         // DSH settings/home
]

// Tools that mutate the workspace. Only these are subject to the guard's
// path/file_path/target branch; read-only tools (read/glob/grep/...) are not
// denied merely for carrying a matching path.
export const MUTATING_TOOLS = [
  'write',
  'edit',
  'delete',
  'remove',
  'rename',
  'mkdir',
  'rmdir',
  'patch',
]

export const SHELL_TOOLS = ['bash', 'pwsh']

// Paths whose modification is the `modify-governance-rules` category
// (ADR-0025 §3 / §6). These are guard-denied in runtime and approval-gated in
// maintenance.
export const GOVERNANCE_RULE_PATHS = [
  '.cq/policy/**',
  'preset/plugins/cq-governance/**',
  'preset/skills/cq-governance/**',
  'preset/maintenance/**',
  'preset/agent.cordis.yml',
]

// Baseline role capabilities (V2 P0-5/P0-6): the non-relaxable role floor.
// Project roles.yml may only TIGHTEN these (booleans: Baseline && Project;
// cannot: Baseline ∪ Project). `core` is included so enforceRoles:true cannot
// lock the coordinator out of its own capabilities.
export const BASELINE_ROLES = {
  core: { canWrite: true, canExecuteCommand: true, cannot: ['modify-governance-rules', 'delete-core-data', 'modify-production'] },
  product: { canWrite: true, canExecuteCommand: false, cannot: [] },
  research: { canWrite: true, canExecuteCommand: false, cannot: [] },
  ux: { canWrite: true, canExecuteCommand: false, cannot: [] },
  ui: { canWrite: true, canExecuteCommand: false, cannot: [] },
  architect: { canWrite: true, canExecuteCommand: true, cannot: [] },
  developer: { canWrite: true, canExecuteCommand: true, cannot: ['modify-governance-rules', 'delete-core-data', 'modify-production'] },
  tester: { canWrite: false, canExecuteCommand: true, cannot: [] },
  devops: { canWrite: true, canExecuteCommand: true, cannot: [] },
  review: { canWrite: false, canExecuteCommand: false, cannot: [] },
}

// Baseline gates (V2 P0-7): project may add approval requirements but cannot
// cancel a baseline approval. These gates always require approval.
export const BASELINE_GATES = ['production-release', 'dangerous-ops', 'governance-rule-change']

// Monotonic role merge (V2 P0-6). Project may only tighten:
//   canWrite / canExecuteCommand : Baseline && (Project !== false)
//                                 -> project can lower to false, never raise
//   cannot                       : Baseline ∪ Project
export function effectiveRoles(projectRoles = {}) {
  const out = {}
  for (const [role, base] of Object.entries(BASELINE_ROLES)) {
    const proj = projectRoles[role] || {}
    out[role] = {
      canWrite: base.canWrite && proj.canWrite !== false,
      canExecuteCommand: base.canExecuteCommand && proj.canExecuteCommand !== false,
      cannot: [...new Set([...(base.cannot || []), ...(proj.cannot || [])])],
    }
  }
  return out
}

// Monotonic gate merge (V2 P0-7): baseline gates always present (an approval
// cannot be cancelled); project gates are added on top.
export function effectiveGates(projectGates = {}) {
  const out = {}
  for (const name of BASELINE_GATES) {
    out[name] = projectGates[name] || { description: `baseline gate: ${name}`, tool: 'ask_user_question' }
  }
  for (const [name, g] of Object.entries(projectGates || {})) {
    if (!out[name]) out[name] = g
  }
  return out
}

// Load policy.yml (V2 P0-8): the runtime-level switches. Absent -> baseline
// defaults (defaultDeny=true, failClosed=true). Present but malformed -> throw.
export function loadPolicy(policyDir) {
  const file = join(policyDir, 'policy.yml')
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch (err) {
    if (err && err.code === 'ENOENT') return { defaultDeny: true, failClosed: true, policyVersion: null }
    throw new Error(`governance: policy.yml exists but cannot be read (${file}): ${err.message}`)
  }
  if (!/^\s*schemaVersion:\s*1\s*$/m.test(text)) {
    throw new Error(`governance: policy.yml invalid (missing schemaVersion: 1) at ${file}`)
  }
  const pick = (key) => {
    const m = new RegExp(`^\\s*${key}:\\s*(true|false)\\s*$`, 'm').exec(text)
    return m ? m[1] === 'true' : undefined
  }
  return {
    defaultDeny: pick('defaultDeny'),
    failClosed: pick('failClosed'),
    policyVersion: 1,
  }
}

// Normalize a path: backslashes -> forward slashes, collapse repeated slashes.
// No tokenization / variable expansion (that would be a shell parser — banned).
export function normalizePath(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/\/{2,}/g, '/')
}

// Shell command normalization shares the same rule: `\` -> `/`, collapse `//`.
export function normalizeCommand(value) {
  return normalizePath(value)
}

// Match one protected-path pattern against a normalized path.
// Supported shapes (aligned with .cq/policy/protected-paths.yml):
//   preset/**          -> starts with "preset/" (or equals "preset")
//   .cq/policy/**      -> starts with ".cq/policy/"
//   **/credentials/**  -> any ancestor directory named "credentials"
//   **.env             -> ends with ".env"
//   exact/path.yml     -> exact match
export function patternMatches(pattern, normalizedPath) {
  if (pattern.startsWith('**/')) {
    const tail = pattern.slice(3)
    if (tail.endsWith('/**')) {
      const dir = tail.slice(0, -3)
      return normalizedPath.split('/').includes(dir)
    }
    return normalizedPath.endsWith(tail)
  }
  if (pattern.endsWith('/**')) {
    return normalizedPath.startsWith(pattern.slice(0, -3)) || normalizedPath === pattern.slice(0, -3)
  }
  if (pattern.startsWith('**.')) {
    return normalizedPath.endsWith(pattern.slice(2))
  }
  return normalizedPath === pattern
}

// Reduce a protected-path pattern to the literal substring a shell command must
// contain to be conservatively denied (ADR-0025 §2). Returns null when the
// pattern has no safe shell signature (not matched by the shell branch).
export function shellSignature(pattern) {
  switch (pattern) {
    case 'preset/**': return 'preset/'
    case '.cq/policy/**': return '.cq/policy/'
    case '**/credentials/**': return 'credentials/'
    case '**.env': return '.env'
    case '.dsh/**': return '.dsh/'
    default: return null
  }
}

// Load project protected-paths.yml with the fail-closed three-state contract:
//   ENOENT (absent)          -> []  (baseline only)
//   present but schemaVersion≠1 -> throw
//   present, schemaVersion 1, but no protected entries -> throw
//   valid                    -> patterns[]
export function loadProjectPaths(policyDir) {
  const file = join(policyDir, 'protected-paths.yml')
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch (err) {
    if (err && err.code === 'ENOENT') return []
    throw new Error(`governance: protected-paths policy exists but cannot be read (${file}): ${err.message}`)
  }
  if (!/^\s*schemaVersion:\s*1\s*$/m.test(text)) {
    throw new Error(`governance: protected-paths policy invalid (missing schemaVersion: 1) at ${file}`)
  }
  const patterns = []
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*-\s+"([^"]+)"\s*$/)
    if (m) patterns.push(m[1])
  }
  if (patterns.length === 0) {
    throw new Error(`governance: protected-paths policy invalid (no protected entries) at ${file}`)
  }
  return patterns
}

// Parse roles.yml (schemaVersion 1) into { roleName: { canWrite, canExecuteCommand, cannot } }.
// Zero-dependency minimal YAML-subset parser. Absent file -> {} (no known roles,
// so any spawn is UNKNOWN -> deny-default once role enforcement is on). Present
// but malformed -> throw (fail-closed).
export function loadRoles(policyDir) {
  const file = join(policyDir, 'roles.yml')
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch (err) {
    if (err && err.code === 'ENOENT') return {}
    throw new Error(`governance: roles policy exists but cannot be read (${file}): ${err.message}`)
  }
  if (!/^\s*schemaVersion:\s*1\s*$/m.test(text)) {
    throw new Error(`governance: roles policy invalid (missing schemaVersion: 1) at ${file}`)
  }
  const inRoles = /^\s*roles:\s*$/m.test(text)
  if (!inRoles) {
    throw new Error(`governance: roles policy invalid (missing "roles:" section) at ${file}`)
  }
  const roles = {}
  let currentRole = null
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*schemaVersion:\s*1\s*$/.test(line)) continue
    if (/^\s*roles:\s*$/.test(line)) continue
    const roleHeader = line.match(/^\s{2}([A-Za-z0-9_-]+):\s*$/)
    if (roleHeader) {
      currentRole = roleHeader[1]
      roles[currentRole] = { canWrite: false, canExecuteCommand: false, cannot: [] }
      continue
    }
    if (currentRole) {
      const canWrite = line.match(/^\s{4}canWrite:\s*(true|false)\s*$/)
      const canExec = line.match(/^\s{4}canExecuteCommand:\s*(true|false)\s*$/)
      const cannot = line.match(/^\s{4}cannot:\s*\[([^\]]*)\]\s*$/)
      if (canWrite) roles[currentRole].canWrite = canWrite[1] === 'true'
      else if (canExec) roles[currentRole].canExecuteCommand = canExec[1] === 'true'
      else if (cannot) {
        roles[currentRole].cannot = cannot[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      }
    }
  }
  if (Object.keys(roles).length === 0) {
    throw new Error(`governance: roles policy invalid (no roles declared) at ${file}`)
  }
  return roles
}

// Parse gates.yml (schemaVersion 1) into { gateName: { description, tool } }.
// Absent -> {}; present but malformed -> throw (fail-closed).
export function loadGates(policyDir) {
  const file = join(policyDir, 'gates.yml')
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch (err) {
    if (err && err.code === 'ENOENT') return {}
    throw new Error(`governance: gates policy exists but cannot be read (${file}): ${err.message}`)
  }
  if (!/^\s*schemaVersion:\s*1\s*$/m.test(text)) {
    throw new Error(`governance: gates policy invalid (missing schemaVersion: 1) at ${file}`)
  }
  const gates = {}
  let currentGate = null
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*schemaVersion:\s*1\s*$/.test(line)) continue
    if (/^\s*gates:\s*$/.test(line)) continue
    const gateHeader = line.match(/^\s{2}([A-Za-z0-9_-]+):\s*$/)
    if (gateHeader) {
      currentGate = gateHeader[1]
      gates[currentGate] = { description: '', tool: null }
      continue
    }
    if (currentGate) {
      const desc = line.match(/^\s{4}description:\s*(.*)$/)
      const tool = line.match(/^\s{4}tool:\s*([A-Za-z0-9_]+)\s*$/)
      if (desc) gates[currentGate].description = desc[1].trim()
      else if (tool) gates[currentGate].tool = tool[1]
    }
  }
  if (Object.keys(gates).length === 0) {
    throw new Error(`governance: gates policy invalid (no gates declared) at ${file}`)
  }
  return gates
}

// The guard-level deny set for a mode (paths hard-denied by tools.guard).
//   runtime:     baseline ∪ project (full) — preset/**, .cq/policy/**, .env,
//                credentials, .dsh/** all denied.
//   maintenance: preset/** and .cq/policy/** are lifted (preset writable;
//                governance rules become approval-gated in the pre-execute
//                layer), while .env / credentials / .dsh/** remain hard-denied.
export function effectiveGuard(mode, projectProtected = []) {
  if (mode === 'maintenance') {
    const lifted = new Set(['preset/**', '.cq/policy/**'])
    const base = BASELINE_PROTECTED_PATHS.filter((p) => !lifted.has(p))
    const proj = projectProtected.filter((p) => !lifted.has(p))
    return [...new Set([...base, ...proj])]
  }
  return [...new Set([...BASELINE_PROTECTED_PATHS, ...projectProtected])]
}

// Path patterns that are approval-gated (ask) in a given mode rather than
// guard-denied. In maintenance the governance declarations are lifted from the
// guard, so they must be re-introduced as an approval requirement here.
export function approvalGated(mode) {
  return mode === 'maintenance' ? GOVERNANCE_RULE_PATHS : []
}

// Map one roles.yml `cannot` category onto a pre-execute decision for an
// operation. `op` = { tool, path, command }. Returns
//   { decision: 'deny'|'ask', reason }   when the category applies,
//   null                                  otherwise.
// ADR-0025 §3:
//   modify-governance-rules -> deny (governance paths / write+edit / shell literal)
//   delete-core-data        -> ask  (.cq/**, preset/**, **/credentials/** or rm /
//                                   Remove-Item -Recurse substring)
//   modify-production       -> ask  (git push / --force / git reset / deploy /
//                                   kubectl apply / terraform apply / npm publish
//                                   substring or **/production*, **/.env.production)
export function cannotMap(category, op = {}) {
  const tool = op.tool
  const path = normalizePath(op.path)
  const command = normalizeCommand(op.command)
  switch (category) {
    case 'modify-governance-rules': {
      if (MUTATING_TOOLS.includes(tool)) {
        for (const p of GOVERNANCE_RULE_PATHS) {
          if (patternMatches(p, path)) {
            return { decision: 'deny', reason: 'modify-governance-rules' }
          }
        }
      }
      if (SHELL_TOOLS.includes(tool)) {
        for (const p of GOVERNANCE_RULE_PATHS) {
          const sig = shellSignature(p)
          if (sig && command.includes(sig)) {
            return { decision: 'deny', reason: 'modify-governance-rules' }
          }
        }
      }
      return null
    }
    case 'delete-core-data': {
      if (['delete', 'remove', 'rmdir'].includes(tool)) {
        for (const p of ['.cq/**', 'preset/**', '**/credentials/**']) {
          if (patternMatches(p, path)) {
            return { decision: 'ask', reason: 'delete-core-data' }
          }
        }
      }
      if (SHELL_TOOLS.includes(tool)) {
        if (/\brm\b/.test(command) || command.includes('Remove-Item -Recurse')) {
          return { decision: 'ask', reason: 'delete-core-data' }
        }
      }
      return null
    }
    case 'modify-production': {
      if (SHELL_TOOLS.includes(tool)) {
        for (const s of ['git push', '--force', 'git reset', 'deploy', 'kubectl apply', 'terraform apply', 'npm publish']) {
          if (command.includes(s)) return { decision: 'ask', reason: 'modify-production' }
        }
      }
      if (patternMatches('**/production*', path) || patternMatches('**/.env.production', path)) {
        return { decision: 'ask', reason: 'modify-production' }
      }
      return null
    }
    default:
      return null
  }
}
