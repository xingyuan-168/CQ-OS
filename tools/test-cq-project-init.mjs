#!/usr/bin/env node
// Tests for CQ project initializer (tools/cq-project-init.mjs) via its CLI.
// Covers dry-run, real init (git init), fail-closed on non-empty target, and
// the missing --target guard.
import { mkdtempSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()
const SCRIPT = join(ROOT, 'tools', 'cq-project-init.mjs')

function run(args) {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', cwd: ROOT, timeout: 60000 }).trim()
    return { code: 0, out: JSON.parse(out) }
  } catch (err) {
    const raw = String(err?.stdout || err?.stderr || err?.message || err).trim()
    let parsed = raw
    try { parsed = JSON.parse(raw) } catch {}
    return { code: err?.status ?? 1, out: parsed }
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg) }

// 1) dry-run lists the planned files without writing
const d1 = mkdtempSync(join(tmpdir(), 'cq-init-dry-'))
const r1 = run(['--target', d1, '--name', 'demo', '--dry-run'])
assert(r1.out?.ok === true && r1.out?.dryRun === true, 'dry-run should report ok+dryRun')
assert(Array.isArray(r1.out.files) && r1.out.files.includes('README.md') && r1.out.files.includes('.cq/project.md'), 'dry-run files should include README.md and .cq/project.md')
assert(!existsSync(join(d1, 'README.md')), 'dry-run must not write files')

// 2) real init creates the skeleton and runs git init
const d2 = mkdtempSync(join(tmpdir(), 'cq-init-real-'))
const r2 = run(['--target', d2, '--name', 'demo2'])
assert(r2.out?.ok === true, 'real init should succeed')
assert(Array.isArray(r2.out.created) && r2.out.created.includes('.git (git init)'), 'created should include git init')
assert(existsSync(join(d2, 'README.md')), 'README.md should be created')
assert(existsSync(join(d2, '.git')) && statSync(join(d2, '.git')).isDirectory(), 'git repo should be initialized')

// 3) fail-closed: non-empty target without --force
const d3 = mkdtempSync(join(tmpdir(), 'cq-init-dirty-'))
writeFileSync(join(d3, 'existing.txt'), 'x')
const r3 = run(['--target', d3])
assert(r3.out?.ok === false && Array.isArray(r3.out.errors) && r3.out.errors.some((e) => /not empty/i.test(e)), 'non-empty target must be rejected without --force')

// 4) missing --target
const r4 = run([])
assert(r4.code !== 0 && Array.isArray(r4.out?.errors) && r4.out.errors.some((e) => /--target/.test(e)), 'missing --target must error')

console.log(JSON.stringify({ ok: true, checks: 4 }))
for (const d of [d1, d2, d3]) rmSync(d, { recursive: true, force: true })
