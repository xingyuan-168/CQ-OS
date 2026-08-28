#!/usr/bin/env node
// Tests for CQ maintenance preflight (tools/cq-maint-preflight.mjs) via its CLI.
// Uses --skip-tests so the suite does not recurse. Asserts the preflight output
// shape (git-clean signal, deploy prep, drift array, rollback path, and the
// never-auto-executed PENDING_USER_APPROVAL list). It does NOT assert ok:true,
// because that depends on the live deployment directory and git state.
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()
const SCRIPT = join(ROOT, 'tools', 'cq-maint-preflight.mjs')

function run() {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, '--skip-tests'], { encoding: 'utf8', cwd: ROOT, timeout: 120000 }).trim()
    return { code: 0, out: JSON.parse(out) }
  } catch (err) {
    const raw = String(err?.stdout || err?.stderr || err?.message || err).trim()
    let parsed = raw
    try { parsed = JSON.parse(raw) } catch {}
    return { code: err?.status ?? 1, out: parsed }
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg) }

const r = run()
assert(typeof r.out === 'object', 'preflight must emit JSON')
assert(typeof r.out.gitClean === 'boolean', 'gitClean must be boolean')
assert(Array.isArray(r.out.deployPrep) && r.out.deployPrep.length > 0, 'deployPrep must be a non-empty array')
assert(Array.isArray(r.out.presetDeployDrift), 'presetDeployDrift must be an array')
assert(typeof r.out.rollbackPath === 'string', 'rollbackPath must be a string')
assert(Array.isArray(r.out.pendingUserApproval) && r.out.pendingUserApproval.length > 0, 'pendingUserApproval must be a non-empty array')
assert(typeof r.out.regression === 'object', 'regression must be an object')

console.log(JSON.stringify({ ok: true, checks: 5 }))
