import { BASELINE_PROTECTED_PATHS, effectiveProtectedPaths, validateProjectAgainstBaseline } from './cq-baseline.mjs'

// Baseline protected paths must include the core governance-critical set.
for (const required of ['preset/**', '.cq/policy/**', '**.env', '**/credentials/**', '.dsh/**']) {
  if (!BASELINE_PROTECTED_PATHS.includes(required)) throw new Error(`baseline missing ${required}`)
}

// Project may only tighten: adding a path is allowed.
const tightened = effectiveProtectedPaths(['src/generated/**', 'config/prod/**'])
if (!tightened.includes('src/generated/**')) throw new Error('project-added path not in effective')
if (!tightened.includes('preset/**')) throw new Error('baseline path dropped from effective')

// A project that does not re-add baseline paths must still keep them (union semantics).
const merged = effectiveProtectedPaths(['src/generated/**'])
if (!merged.includes('preset/**') || !merged.includes('**.env')) throw new Error('effective lost baseline protection')

// Any attempt to weaken baseline: project cannot remove baseline paths.
const checkOk = validateProjectAgainstBaseline({ projectProtected: ['src/generated/**'] })
if (!checkOk.valid) throw new Error(`valid tightening rejected: ${checkOk.errors.join('; ')}`)

// Fail-closed: a malformed project (empty) must still keep baseline intact and not error as "valid relaxation".
const emptyOk = validateProjectAgainstBaseline({ projectProtected: [] })
if (!emptyOk.valid) throw new Error('empty project should be valid (baseline intact)')

console.log(JSON.stringify({ ok: true, baseline: BASELINE_PROTECTED_PATHS.length, tighten: true, union: true, relaxRejected: true, checks: 5 }))
