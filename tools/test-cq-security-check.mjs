#!/usr/bin/env node
// Tests for CQ security check (tools/cq-security-check.mjs) via its CLI.
// Asserts the normalized output schema, stack detection (node project here),
// scanner detection (available must list installed scanners), and that
// absent scanners are reported with a reason (SKIPPED_WITH_REASON, never an error).
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()
const SCRIPT = join(ROOT, 'tools', 'cq-security-check.mjs')

function run() {
  try {
    const out = execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8', cwd: ROOT, timeout: 120000 }).trim()
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
assert(typeof r.out === 'object' && typeof r.out.ok === 'boolean', 'ok must be boolean')
assert(typeof r.out.stack === 'string' && r.out.stack.length > 0, 'stack must be non-empty (package.json present)')
assert(Array.isArray(r.out.available), 'available must be an array')
assert(Array.isArray(r.out.results), 'results must be an array')
assert(typeof r.out.scannersScanned === 'number', 'scannersScanned must be a number')

// node stack => npm-audit should be detected as available
assert(r.out.available.includes('npm-audit'), 'npm-audit should be detected as available in a node project')

// every result carries ran, and ran=>clean/summary, not-ran=>reason (SKIPPED_WITH_REASON)
for (const res of r.out.results) {
  assert(typeof res.ran === 'boolean', 'each result needs ran flag')
  if (res.ran) assert(typeof res.clean === 'boolean', 'ran result needs clean flag')
  else assert(typeof res.reason === 'string', 'skipped scanner needs a reason')
}

console.log(JSON.stringify({ ok: true, checks: 6 }))
