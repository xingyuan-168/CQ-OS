#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// CQ OS policy validator. Policies are small declarative files under .cq/policy.
// This validator does NOT parse YAML fully (no dependency); it enforces the
// exact structural contract each file must satisfy, so a malformed or missing
// policy fails closed. It inspects the actual authored files.

const KNOWN_ROLES = new Set(['product', 'research', 'ux', 'ui', 'architect', 'developer', 'tester', 'devops', 'review', 'core'])

function read(dir, name, errors) {
  try { return readFileSync(join(dir, name), 'utf8') }
  catch { errors.push(`missing policy file: ${name}`); return '' }
}

export function validatePolicy(policyDir) {
  const errors = []
  const root = resolve(policyDir)

  // ── policy.yml ──────────────────────────────────────────────────────────
  const policyText = read(root, 'policy.yml', errors)
  if (policyText) {
    if (!/^\s*schemaVersion:\s*1\s*$/m.test(policyText)) errors.push('policy.yml: schemaVersion must be 1')
    if (!/^\s*defaultDeny:\s*(true|false)\s*$/m.test(policyText)) errors.push('policy.yml: defaultDeny must be true/false')
    if (!/^\s*failClosed:\s*(true|false)\s*$/m.test(policyText)) errors.push('policy.yml: failClosed must be true/false')
    if (!/^\s*defaultDeny:\s*true\s*$/m.test(policyText)) errors.push('policy.yml: defaultDeny must be true (fail-closed)')
  }

  // ── roles.yml ───────────────────────────────────────────────────────────
  const rolesText = read(root, 'roles.yml', errors)
  if (rolesText) {
    if (!/^\s*schemaVersion:\s*1\s*$/m.test(rolesText)) errors.push('roles.yml: schemaVersion must be 1')
    for (const role of KNOWN_ROLES) {
      const declared = new RegExp(`^\\s{2}${role}:\\s*$`, 'm').test(rolesText)
      if (!declared && role !== 'core') errors.push(`roles.yml: missing role ${role}`)
    }
    // Developer must explicitly declare its cannot boundary (governance-critical).
    if (!/^\s{2}developer:\s*$/m.test(rolesText)) errors.push('roles.yml: missing developer role')
    if (!/cannot:/.test(rolesText.slice(rolesText.indexOf('developer:'), rolesText.indexOf('architect:')))) errors.push('roles.yml: developer must declare cannot boundary')
  }

  // ── protected-paths.yml ─────────────────────────────────────────────────
  const ppText = read(root, 'protected-paths.yml', errors)
  if (ppText) {
    if (!/^\s*schemaVersion:\s*1\s*$/m.test(ppText)) errors.push('protected-paths.yml: schemaVersion must be 1')
    const entries = (ppText.match(/^\s*-\s+"[^"]+"\s*$/gm) || [])
    if (entries.length === 0) errors.push('protected-paths.yml: protected list must be non-empty')
    if (!ppText.includes('preset/**')) errors.push('protected-paths.yml: must protect preset/**')
    if (!ppText.includes('.cq/policy/**')) errors.push('protected-paths.yml: must protect .cq/policy/**')
  }

  // ── gates.yml ───────────────────────────────────────────────────────────
  const gatesText = read(root, 'gates.yml', errors)
  if (gatesText) {
    if (!/^\s*schemaVersion:\s*1\s*$/m.test(gatesText)) errors.push('gates.yml: schemaVersion must be 1')
    for (const required of ['design-approval', 'frontend-approval', 'production-release']) {
      if (!new RegExp(`^\\s{2}${required}:`, 'm').test(gatesText)) errors.push(`gates.yml: missing gate ${required}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dir = resolve(process.argv[2] || '.cq/policy')
  const result = validatePolicy(dir)
  console.log(JSON.stringify(result, null, 2))
  if (!result.valid) process.exitCode = 1
}
