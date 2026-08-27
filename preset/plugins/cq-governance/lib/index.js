// @cq/governance — CQ OS governance plugin.
// Enforces a two-layer policy via DSH tools.guard (monotonic deny):
//   Baseline Policy (embedded, non-relaxable) ∪ Project Policy (.cq/policy)
// Effective = union of denials; any denial wins (fail-closed). Project may only
// tighten baseline. `mode` selects the policy level:
//   runtime:     strict — preset/**, .cq/policy/**, .env, credentials, .dsh/** denied
//   maintenance: elevated — may write preset/**, but governance files, deploy,
//                and destructive actions still require Human Approval.
import { readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const BASELINE_PROTECTED_PATHS = ['preset/**', '.cq/policy/**', '**.env', '**/credentials/**', '.dsh/**']

function patternMatches(pattern, normalizedPath) {
  if (pattern.startsWith('**/')) {
    const tail = pattern.slice(3)
    if (tail.endsWith('/**')) return normalizedPath.split('/').includes(tail.slice(0, -3))
    return normalizedPath.endsWith(tail)
  }
  if (pattern.endsWith('/**')) return normalizedPath.startsWith(pattern.slice(0, -3)) || normalizedPath === pattern.slice(0, -3)
  if (pattern.startsWith('**.')) return normalizedPath.endsWith(pattern.slice(2))
  return normalizedPath === pattern
}

function loadProjectPaths(policyDir) {
  try {
    const text = readFileSync(join(policyDir, 'protected-paths.yml'), 'utf8')
    const patterns = []
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*-\s+"([^"]+)"\s*$/)
      if (m) patterns.push(m[1])
    }
    return patterns
  } catch { return [] }
}

function effectiveProtectedPaths({ mode, projectProtected }) {
  // Two policy levels (system-selected, not project-relaxable):
  //   runtime:     preset/** denied (strict); project may tighten.
  //   maintenance: preset/** writable (system elevates it), but all other
  //                baseline protections and project tightenings still apply.
  // Project policy may only tighten runtime policy; it can never relax baseline.
  // The maintenance elevation of preset/** is a system choice, not a project relax.
  const excluded = mode === 'maintenance' ? ['preset/**'] : []
  const source = mode === 'maintenance'
    ? [...BASELINE_PROTECTED_PATHS.filter((p) => p !== 'preset/**'), ...projectProtected.filter((p) => p !== 'preset/**')]
    : [...BASELINE_PROTECTED_PATHS, ...projectProtected]
  return [...new Set(source.filter((p) => !excluded.includes(p)))]
}

export const Config = { mode: 'runtime' }

export function apply(ctx, config = {}) {
  const mode = config.mode === 'maintenance' ? 'maintenance' : 'runtime'
  const policyDir = resolve(config.policyDir || '.cq/policy')
  const projectProtected = loadProjectPaths(policyDir)
  const effective = effectiveProtectedPaths({ mode, projectProtected })

  const tools = ctx.get('tools')
  if (tools && typeof tools.guard === 'function') {
    const dispose = tools.guard((exec) => {
      const args = exec && exec.arguments
      const target = args && (args.path || args.file_path || args.target)
      if (!target) return undefined
      const normalized = String(target).replaceAll('\\', '/')
      for (const pattern of effective) {
        if (patternMatches(pattern, normalized)) {
          return `governance(${mode}): protected path denied: ${target}`
        }
      }
      return undefined
    })
    ctx.effect(() => dispose)
  }
}
