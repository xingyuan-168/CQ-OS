#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

// CQ OS Baseline Policy — the system-embedded, non-relaxable governance floor.
// Project `.cq/policy/` (Project Policy) may only tighten this baseline; it can
// never remove or weaken a baseline deny. Effective policy = union of denials:
// if either baseline or project denies, the action is denied (fail-closed).

export const BASELINE_PROTECTED_PATHS = [
  'preset/**',          // CQ OS sole source of truth
  '.cq/policy/**',      // governance declarations
  '**.env',             // secrets
  '**/credentials/**',  // credentials
  '.dsh/**',            // DSH settings/home
]

// Role-level baseline (BASELINE_ROLES) is the single source of truth in
// preset/plugins/cq-governance/lib/policy.js — do not redefine roles here, to
// avoid drift between the path floor (this file) and the role floor (policy.js).

// Merge baseline + project protected paths into the effective set (union of denials).
// Project may add paths; it may not remove baseline paths. Returns the effective list.
export function effectiveProtectedPaths(projectProtected = []) {
  const effective = new Set(BASELINE_PROTECTED_PATHS)
  for (const p of projectProtected) effective.add(p)
  return [...effective]
}

// Validate that a project policy does not attempt to relax the baseline.
// A project MAY add protected paths; it must not claim a baseline path is allowed.
export function validateProjectAgainstBaseline({ projectProtected = [] }) {
  const errors = []
  // Baseline paths must remain present in the effective (project can only add).
  for (const base of BASELINE_PROTECTED_PATHS) {
    if (!effectiveProtectedPaths(projectProtected).includes(base)) {
      errors.push(`baseline protected path "${base}" was removed by project policy (not allowed)`)
    }
  }
  return { valid: errors.length === 0, errors }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const project = process.argv[2] ? JSON.parse(process.argv[2]) : []
  const effective = effectiveProtectedPaths(project)
  const check = validateProjectAgainstBaseline({ projectProtected: project })
  console.log(JSON.stringify({ baseline: BASELINE_PROTECTED_PATHS, effective, valid: check.valid, errors: check.errors }, null, 2))
  if (!check.valid) process.exitCode = 1
}
